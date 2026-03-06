defmodule Mix.Tasks.Boton.ImportSupabase do
  use Mix.Task

  @shortdoc "Import Supabase auth/domain exports into the owned Postgres schema"

  alias BotonBackend.Importers.Supabase

  @switches [
    dir: :string,
    users: :string,
    profiles: :string,
    circles: :string,
    alerts: :string,
    "circle-members": :string,
    "alert-responses": :string,
    "alert-messages": :string
  ]

  @impl Mix.Task
  def run(args) do
    Mix.Task.run("app.start")

    {opts, _argv, invalid} = OptionParser.parse(args, strict: @switches)

    if invalid != [] do
      raise "invalid options: #{inspect(invalid)}"
    end

    paths =
      opts
      |> normalize_options()
      |> Supabase.resolve_paths()

    if map_size(paths) == 0 do
      raise """
      no import files were found.

      Example:
        mix boton.import_supabase --dir ./tmp/supabase-export
      """
    end

    Mix.shell().info("Importing Supabase exports:")

    Enum.each(paths, fn {dataset, path} ->
      Mix.shell().info("  #{dataset}: #{path}")
    end)

    counts = Supabase.import_from_paths(paths)

    Mix.shell().info("\nImport complete:")

    Enum.each(Supabase.dataset_names(), fn dataset ->
      count = Map.get(counts, dataset, 0)
      Mix.shell().info("  #{dataset}: #{count}")
    end)
  end

  defp normalize_options(opts) do
    %{
      dir: opts[:dir],
      users: opts[:users],
      profiles: opts[:profiles],
      circles: opts[:circles],
      circle_members: opts[:"circle-members"],
      alerts: opts[:alerts],
      alert_responses: opts[:"alert-responses"],
      alert_messages: opts[:"alert-messages"]
    }
    |> Enum.reject(fn {_key, value} -> is_nil(value) end)
    |> Map.new()
  end
end
