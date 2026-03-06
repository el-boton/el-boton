const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encode(latitude: number, longitude: number, precision = 6): string {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2;
      if (longitude >= lonMid) {
        idx = idx * 2 + 1;
        lonMin = lonMid;
      } else {
        idx = idx * 2;
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (latitude >= latMid) {
        idx = idx * 2 + 1;
        latMin = latMid;
      } else {
        idx = idx * 2;
        latMax = latMid;
      }
    }
    evenBit = !evenBit;

    if (++bit === 5) {
      geohash += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }

  return geohash;
}

export function getNeighbors(geohash: string): string[] {
  // Returns the 8 neighboring geohashes + the original
  // This is used for proximity queries
  const neighbors: string[] = [geohash];

  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1], [1, 0], [1, 1]
  ];

  const { lat, lon } = decode(geohash);
  const precision = geohash.length;

  // Approximate cell size for the precision level
  const latErr = 180 / Math.pow(2, Math.floor(precision * 5 / 2));
  const lonErr = 360 / Math.pow(2, Math.ceil(precision * 5 / 2));

  for (const [dLat, dLon] of directions) {
    const newLat = lat + dLat * latErr * 2;
    const newLon = lon + dLon * lonErr * 2;

    if (newLat >= -90 && newLat <= 90 && newLon >= -180 && newLon <= 180) {
      neighbors.push(encode(newLat, newLon, precision));
    }
  }

  return [...new Set(neighbors)];
}

export function decode(geohash: string): { lat: number; lon: number } {
  let evenBit = true;
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  for (const char of geohash) {
    const idx = BASE32.indexOf(char);
    for (let n = 4; n >= 0; n--) {
      const bitN = (idx >> n) & 1;
      if (evenBit) {
        const lonMid = (lonMin + lonMax) / 2;
        if (bitN === 1) {
          lonMin = lonMid;
        } else {
          lonMax = lonMid;
        }
      } else {
        const latMid = (latMin + latMax) / 2;
        if (bitN === 1) {
          latMin = latMid;
        } else {
          latMax = latMid;
        }
      }
      evenBit = !evenBit;
    }
  }

  return {
    lat: (latMin + latMax) / 2,
    lon: (lonMin + lonMax) / 2,
  };
}
