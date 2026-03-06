import { encode, decode, getNeighbors } from '@/lib/geohash';

describe('geohash', () => {
  describe('encode', () => {
    it('encodes San Francisco coordinates correctly', () => {
      const hash = encode(37.7749, -122.4194, 6);
      expect(hash).toBe('9q8yyk');
    });

    it('encodes New York coordinates correctly', () => {
      const hash = encode(40.7128, -74.006, 6);
      expect(hash).toBe('dr5reg');
    });

    it('encodes with different precision levels', () => {
      const hash4 = encode(37.7749, -122.4194, 4);
      const hash6 = encode(37.7749, -122.4194, 6);
      const hash8 = encode(37.7749, -122.4194, 8);

      expect(hash4).toHaveLength(4);
      expect(hash6).toHaveLength(6);
      expect(hash8).toHaveLength(8);
      expect(hash6.startsWith(hash4)).toBe(true);
      expect(hash8.startsWith(hash6)).toBe(true);
    });

    it('handles edge coordinates', () => {
      expect(encode(0, 0, 6)).toBe('s00000');
      expect(encode(90, 180, 6)).toBe('zzzzzz');
      expect(encode(-90, -180, 6)).toBe('000000');
    });

    it('defaults to precision 6', () => {
      const hash = encode(37.7749, -122.4194);
      expect(hash).toHaveLength(6);
    });
  });

  describe('decode', () => {
    it('decodes a geohash back to approximate coordinates', () => {
      const original = { lat: 37.7749, lon: -122.4194 };
      const hash = encode(original.lat, original.lon, 6);
      const decoded = decode(hash);

      // Precision 6 gives ~1.2km accuracy
      expect(Math.abs(decoded.lat - original.lat)).toBeLessThan(0.01);
      expect(Math.abs(decoded.lon - original.lon)).toBeLessThan(0.01);
    });

    it('decodes known geohash correctly', () => {
      const decoded = decode('9q8yyk');
      expect(decoded.lat).toBeCloseTo(37.77, 1);
      expect(decoded.lon).toBeCloseTo(-122.42, 1);
    });
  });

  describe('getNeighbors', () => {
    it('returns 9 geohashes including the original', () => {
      const neighbors = getNeighbors('9q8yyk');
      expect(neighbors.length).toBeGreaterThanOrEqual(8);
      expect(neighbors).toContain('9q8yyk');
    });

    it('returns unique geohashes', () => {
      const neighbors = getNeighbors('9q8yyk');
      const unique = [...new Set(neighbors)];
      expect(unique.length).toBe(neighbors.length);
    });

    it('returns geohashes of the same length', () => {
      const neighbors = getNeighbors('9q8yyk');
      neighbors.forEach((hash) => {
        expect(hash).toHaveLength(6);
      });
    });

    it('returns adjacent geohashes', () => {
      const center = '9q8yyk';
      const neighbors = getNeighbors(center);
      const centerDecoded = decode(center);

      neighbors.forEach((hash) => {
        const decoded = decode(hash);
        // All neighbors should be within ~5km of center
        const latDiff = Math.abs(decoded.lat - centerDecoded.lat);
        const lonDiff = Math.abs(decoded.lon - centerDecoded.lon);
        expect(latDiff).toBeLessThan(0.1);
        expect(lonDiff).toBeLessThan(0.1);
      });
    });
  });
});
