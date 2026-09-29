/** Decimal text for a map pin. Drops trailing zeros so -20.04 stays -20.04. */
function mapCoord(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(5).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

/** Keyless Google share-embed for the entered pin. */
export function mapsEmbedUrl(lat: number, lon: number): string {
  const a = mapCoord(lat);
  const o = mapCoord(lon);
  if (!a || !o) return "";
  return (
    "https://www.google.com/maps/embed?origin=mfe&pb=!1m17!1m12!1m3!1d3689!2d" +
    o +
    "!3d" +
    a +
    "!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2s" +
    a +
    "," +
    o +
    "!5e0!3m2!1sen!2sbr"
  );
}

/** Documented Google Maps search URL for the same pin. No API key. */
export function mapsOpenUrl(lat: number, lon: number): string {
  const a = mapCoord(lat);
  const o = mapCoord(lon);
  if (!a || !o) return "";
  return "https://www.google.com/maps/search/?api=1&query=" + a + "," + o;
}
