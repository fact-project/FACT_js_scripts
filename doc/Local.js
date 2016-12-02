throw new Error("Description for built in functions. Must not be included!");
/**
 * @fileOverview
 *    Documentation of Local class built into dimctrl.
 */

/**
 * @class
 *
 * A set of coordinates on the celestial sphere.
 *
 * The class stores a set of coordinates on the celestial, i.e. local,
 * sky. If the data was the result of a coordinate transformation, the
 * corresponding time is stored in addition. Functions to convert to sky
 * coordinates and to measure distances on th sky are included.
 *
 * @param {Number} zenithDistance
 *     Zenith angle in degree (Zenith=0deg)
 *
 * @param {Number} azimuth
 *     Azimuth angle in degree (North=0deg, East=90deg)
 *
 * @example
 *     var local = new Local(12, 45);
 *     var sky   = local.toSky();
 *
 * @author <a href="mailto:thomas.bretz@epfl.ch">Thomas Bretz</a>
 *
 */
function Local(zenithDistance, azimuth)
{
    /**
     * Zenith distance in degree (Zenith=0deg)
     *
     * @constant
     *
     * @type Number
     */
    this.zd = zenithDistance;

    /**
     * Azimuth in degree (North=0deg, East=90deg)
     *
     * @constant
     *
     * @type Number
     */
    this.az = azimuth;

    /**
     * Time corresponding to ra and dec if they are the result of
     * a conversion.
     *
     * @constant
     * @default undefined
     *
     * @type Date
     */
    this.time = undefined;


    /**
     * Convert celestial coordinats to sky coordinates.
     * As observatory location the FACT telescope is assumed.
     * The conversion is done using libnova's ln_get_equ_from_hrz.
     *
     * @constant
     *
     * @param {Date} [time=new Date()]
     *     Reference time for the conversion
     *
     * @returns {Sky}
     *     A Sky object with the converted coordinates and
     *     the corresponding time.
     */
    this.toSky = function() { /* [native code] */ }
}

/**
 * Calculate the distance between two celestial sky positions.
 *
 * The distance between the two provided objects is calculated.
 * The returned value is an absolute distance (angle) between
 * the two positions.
 *
 * @constant
 *
 * @param {Local} local1
 *     Celestial coordinates for one of the two objects for which
 *     the distance on the sky should be calculated. In principle
 *     every object with the properties 'zd' and 'az' can be provided.
 *
 * @param {Local} local2
 *     Celestial coordinates for one of the two objects for which
 *     the distance on the sky should be calculated. In principle
 *     every object with the properties 'zd' and 'az' can be provided.
 *
 * @returns {Number}
 *     Absolute distance between both positions on the sky in degrees.
     */
Local.dist = function() { /* [native code] */}
