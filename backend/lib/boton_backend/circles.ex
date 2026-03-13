defmodule BotonBackend.Circles do
  @moduledoc false

  import Ecto.Query

  alias BotonBackend.Accounts.Profile
  alias BotonBackend.Circles.{Circle, CircleMember}
  alias BotonBackend.Repo
  alias Ecto.Multi

  def list_circles_for_user(user_id) do
    member_counts =
      from(member in CircleMember,
        group_by: member.circle_id,
        select: %{circle_id: member.circle_id, member_count: count(member.user_id)}
      )

    CircleMember
    |> where([member], member.user_id == ^user_id)
    |> join(:inner, [member], circle in Circle, on: circle.id == member.circle_id)
    |> join(:left, [member, circle], counts in subquery(member_counts),
      on: counts.circle_id == circle.id
    )
    |> select([member, circle, counts], %{
      id: circle.id,
      name: circle.name,
      created_by: circle.created_by,
      invite_code: circle.invite_code,
      created_at: circle.created_at,
      role: member.role,
      memberCount: coalesce(counts.member_count, 1)
    })
    |> Repo.all()
  end

  def list_circle_members(user_id, circle_id) do
    with :ok <- ensure_member(circle_id, user_id) do
      CircleMember
      |> where([member], member.circle_id == ^circle_id)
      |> join(:inner, [member], profile in Profile, on: profile.id == member.user_id)
      |> order_by([member, profile], asc: member.role, asc: member.joined_at)
      |> select([member, profile], %{
        circle_id: member.circle_id,
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        profile: %{
          id: profile.id,
          display_name: profile.display_name
        }
      })
      |> Repo.all()
      |> then(&{:ok, &1})
    end
  end

  def create_circle(user_id, name) do
    Multi.new()
    |> Multi.insert(:circle, fn _changes ->
      %Circle{}
      |> Circle.changeset(%{
        name: String.trim(name),
        created_by: user_id,
        invite_code: generate_invite_code()
      })
    end)
    |> Multi.insert(:membership, fn %{circle: circle} ->
      %CircleMember{}
      |> CircleMember.changeset(%{
        circle_id: circle.id,
        user_id: user_id,
        role: "owner"
      })
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{circle: circle}} ->
        {:ok,
         %{
           id: circle.id,
           name: circle.name,
           created_by: circle.created_by,
           invite_code: circle.invite_code,
           created_at: circle.created_at,
           role: "owner",
           memberCount: 1
         }}

      {:error, _step, changeset, _changes} ->
        {:error, :validation_failed, translate_error(changeset)}
    end
  end

  def join_circle(user_id, invite_code) do
    case Repo.get_by(Circle, invite_code: String.upcase(String.trim(invite_code))) do
      nil ->
        {:error, :circle_not_found, "Invalid invite code"}

      %Circle{} = circle ->
        if Repo.get_by(CircleMember, circle_id: circle.id, user_id: user_id) do
          {:error, :already_member, "You are already in this circle"}
        else
          %CircleMember{}
          |> CircleMember.changeset(%{
            circle_id: circle.id,
            user_id: user_id,
            role: "member"
          })
          |> Repo.insert()
          |> case do
            {:ok, _membership} ->
              member_count =
                CircleMember
                |> where([member], member.circle_id == ^circle.id)
                |> Repo.aggregate(:count, :user_id)

              {:ok,
               %{
                 id: circle.id,
                 name: circle.name,
                 created_by: circle.created_by,
                 invite_code: circle.invite_code,
                 created_at: circle.created_at,
                 role: "member",
                 memberCount: member_count
               }}

            {:error, changeset} ->
              {:error, :validation_failed, translate_error(changeset)}
          end
        end
    end
  end

  def leave_circle(user_id, circle_id) do
    with %CircleMember{} = membership <-
           Repo.get_by(CircleMember, circle_id: circle_id, user_id: user_id) do
      if membership.role == "owner" do
        member_count =
          CircleMember
          |> where([member], member.circle_id == ^circle_id)
          |> Repo.aggregate(:count, :user_id)

        if member_count > 1 do
          {:error, :owner_cannot_leave, "Owners cannot leave a circle with other members"}
        else
          delete_circle(user_id, circle_id)
        end
      else
        Repo.delete(membership)
        {:ok, :left}
      end
    else
      nil -> {:error, :not_found, "Circle membership not found"}
    end
  end

  def remove_member(requesting_user_id, circle_id, member_user_id) do
    with :ok <- ensure_owner(circle_id, requesting_user_id),
         false <- requesting_user_id == member_user_id,
         %CircleMember{} = member <-
           Repo.get_by(CircleMember, circle_id: circle_id, user_id: member_user_id) do
      Repo.delete(member)
      {:ok, :removed}
    else
      true ->
        {:error, :cannot_remove_self, "Owners cannot remove themselves"}

      nil ->
        {:error, :not_found, "Circle member not found"}

      {:error, _code, _message} = error ->
        error
    end
  end

  def delete_circle(user_id, circle_id) do
    with :ok <- ensure_owner(circle_id, user_id),
         %Circle{} = circle <- Repo.get(Circle, circle_id) do
      Repo.delete(circle)
      {:ok, :deleted}
    else
      nil -> {:error, :not_found, "Circle not found"}
      {:error, _code, _message} = error -> error
    end
  end

  def sender_circle_member_ids(sender_id) do
    circle_ids =
      CircleMember
      |> where([member], member.user_id == ^sender_id)
      |> select([member], member.circle_id)
      |> Repo.all()

    CircleMember
    |> where([member], member.circle_id in ^circle_ids and member.user_id != ^sender_id)
    |> select([member], member.user_id)
    |> Repo.all()
  end

  def user_circle_member?(sender_id, user_id) do
    CircleMember
    |> join(:inner, [sender_member], recipient_member in CircleMember,
      on: sender_member.circle_id == recipient_member.circle_id
    )
    |> where(
      [sender_member, recipient_member],
      sender_member.user_id == ^sender_id and recipient_member.user_id == ^user_id
    )
    |> Repo.exists?()
  end

  def ensure_member(circle_id, user_id) do
    if Repo.get_by(CircleMember, circle_id: circle_id, user_id: user_id) do
      :ok
    else
      {:error, :not_found, "Circle not found"}
    end
  end

  defp ensure_owner(circle_id, user_id) do
    case Repo.get_by(CircleMember, circle_id: circle_id, user_id: user_id) do
      %CircleMember{role: "owner"} -> :ok
      _ -> {:error, :not_owner, "Only circle owners can perform this action"}
    end
  end

  defp generate_invite_code do
    6
    |> :crypto.strong_rand_bytes()
    |> Base.url_encode64(padding: false)
    |> binary_part(0, 6)
    |> String.upcase()
  end

  defp translate_error(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {message, _opts} -> message end)
    |> Enum.flat_map(fn {_field, messages} -> messages end)
    |> List.first()
    |> Kernel.||("Validation failed")
  end
end
