package com.elboton.app.widget

object GeohashEncoder {

    private const val BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"

    fun encode(latitude: Double, longitude: Double, precision: Int = 6): String {
        var idx = 0
        var bit = 0
        var evenBit = true
        val geohash = StringBuilder()
        var latMin = -90.0
        var latMax = 90.0
        var lonMin = -180.0
        var lonMax = 180.0

        while (geohash.length < precision) {
            if (evenBit) {
                val lonMid = (lonMin + lonMax) / 2
                if (longitude >= lonMid) {
                    idx = idx * 2 + 1
                    lonMin = lonMid
                } else {
                    idx = idx * 2
                    lonMax = lonMid
                }
            } else {
                val latMid = (latMin + latMax) / 2
                if (latitude >= latMid) {
                    idx = idx * 2 + 1
                    latMin = latMid
                } else {
                    idx = idx * 2
                    latMax = latMid
                }
            }
            evenBit = !evenBit

            bit++
            if (bit == 5) {
                geohash.append(BASE32[idx])
                bit = 0
                idx = 0
            }
        }

        return geohash.toString()
    }

    fun decode(geohash: String): Pair<Double, Double> {
        var evenBit = true
        var latMin = -90.0
        var latMax = 90.0
        var lonMin = -180.0
        var lonMax = 180.0

        for (char in geohash) {
            val idx = BASE32.indexOf(char)
            if (idx == -1) continue

            for (n in 4 downTo 0) {
                val bitN = (idx shr n) and 1
                if (evenBit) {
                    val lonMid = (lonMin + lonMax) / 2
                    if (bitN == 1) {
                        lonMin = lonMid
                    } else {
                        lonMax = lonMid
                    }
                } else {
                    val latMid = (latMin + latMax) / 2
                    if (bitN == 1) {
                        latMin = latMid
                    } else {
                        latMax = latMid
                    }
                }
                evenBit = !evenBit
            }
        }

        return Pair(
            (latMin + latMax) / 2,
            (lonMin + lonMax) / 2
        )
    }
}
