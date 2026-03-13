defmodule BotonBackend.Utils.Geohash do
  @moduledoc false

  import Bitwise

  @base32 ~c"0123456789bcdefghjkmnpqrstuvwxyz"

  def encode(latitude, longitude, precision \\ 6) do
    {hash, _lat_range, _lon_range, _even?, _bit, _char} =
      Enum.reduce_while(
        1..(precision * 5),
        {"", {-90.0, 90.0}, {-180.0, 180.0}, true, 0, 0},
        fn _, state ->
          {hash, lat_range, lon_range, even?, bit, char} = state

          {next_range, next_char} =
            if even? do
              bisect(lon_range, longitude, char, bit)
            else
              bisect(lat_range, latitude, char, bit)
            end

          {next_lat_range, next_lon_range} =
            if even? do
              {lat_range, next_range}
            else
              {next_range, lon_range}
            end

          if bit == 4 do
            next_hash = hash <> <<Enum.at(@base32, next_char)>>

            if byte_size(next_hash) == precision do
              {:halt, {next_hash, next_lat_range, next_lon_range, !even?, 0, 0}}
            else
              {:cont, {next_hash, next_lat_range, next_lon_range, !even?, 0, 0}}
            end
          else
            {:cont, {hash, next_lat_range, next_lon_range, !even?, bit + 1, next_char}}
          end
        end
      )

    hash
  end

  defp bisect({min, max}, value, char, bit) do
    mid = (min + max) / 2
    mask = 1 <<< (4 - bit)

    if value >= mid do
      {{mid, max}, bor(char, mask)}
    else
      {{min, mid}, char}
    end
  end
end
