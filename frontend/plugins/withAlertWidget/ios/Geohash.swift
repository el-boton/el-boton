import Foundation

class Geohash {
    private static let base32 = Array("0123456789bcdefghjkmnpqrstuvwxyz")

    static func encode(latitude: Double, longitude: Double, precision: Int = 6) -> String {
        var idx = 0
        var bit = 0
        var evenBit = true
        var geohash = ""
        var latMin = -90.0, latMax = 90.0
        var lonMin = -180.0, lonMax = 180.0

        while geohash.count < precision {
            if evenBit {
                let lonMid = (lonMin + lonMax) / 2
                if longitude >= lonMid {
                    idx = idx * 2 + 1
                    lonMin = lonMid
                } else {
                    idx = idx * 2
                    lonMax = lonMid
                }
            } else {
                let latMid = (latMin + latMax) / 2
                if latitude >= latMid {
                    idx = idx * 2 + 1
                    latMin = latMid
                } else {
                    idx = idx * 2
                    latMax = latMid
                }
            }
            evenBit = !evenBit

            bit += 1
            if bit == 5 {
                geohash.append(base32[idx])
                bit = 0
                idx = 0
            }
        }

        return geohash
    }

    static func decode(geohash: String) -> (latitude: Double, longitude: Double) {
        var evenBit = true
        var latMin = -90.0, latMax = 90.0
        var lonMin = -180.0, lonMax = 180.0

        for char in geohash {
            guard let idx = base32.firstIndex(of: char) else { continue }
            let idxInt = base32.distance(from: base32.startIndex, to: idx)

            for n in stride(from: 4, through: 0, by: -1) {
                let bitN = (idxInt >> n) & 1
                if evenBit {
                    let lonMid = (lonMin + lonMax) / 2
                    if bitN == 1 {
                        lonMin = lonMid
                    } else {
                        lonMax = lonMid
                    }
                } else {
                    let latMid = (latMin + latMax) / 2
                    if bitN == 1 {
                        latMin = latMid
                    } else {
                        latMax = latMid
                    }
                }
                evenBit = !evenBit
            }
        }

        return (
            latitude: (latMin + latMax) / 2,
            longitude: (lonMin + lonMax) / 2
        )
    }
}
