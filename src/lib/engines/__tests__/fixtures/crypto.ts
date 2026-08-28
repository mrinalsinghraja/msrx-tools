/**
 * Fixtures for the crypto tools.
 *
 * Generated once and committed rather than produced at test time: a fixture
 * that regenerates itself proves the code agrees with itself, which is exactly
 * the bug an envelope format is prone to. These bytes were written by an
 * independent script against the documented layout, so if the reader drifts the
 * test fails.
 *
 * The ciphertext deliberately uses 100,000 PBKDF2 rounds rather than the tool's
 * 600,000 default — the count travels inside the envelope, so this also proves
 * the reader takes it from the message instead of from the options panel.
 */

/** Password the ciphertext below was sealed with. */
export const FIXTURE_PASSWORD = "s3cret";

/** "a fixture the contract test can open", AES-256-GCM, PBKDF2-SHA-256. */
export const FIXTURE_CIPHERTEXT = `TVNSWEVOQzEBAAGGoPsFeRlL9EZ+YE3v7/1WR1TolUDZCdwRD6nqZVP+VriXDf2usKhAGL/udbOCaYTT23Z+z6rNLRLwO7aseoZhmDBVdr0mtuj2UTNqiJMNjq5G`;

/** A throwaway RSA-2048 private key. It protects nothing and never has. */
export const FIXTURE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCg8DBlSU02Tur+
cTocWnkQwJe8tEN62trgxL1pVSvLFbKE0l4jntADhpUXzkCf+J7AZ943UIMacP6k
k8nHWKP4DAnIZ0nhb78WrC0COer0D1kbH1MX7cf3ouHNaVnk9YJQQdYTspKxRvlb
JaKbbb3iIJwtRqNt3/vpM6lrgcwhRg6HuNI4IZfLCe5wkZFSfm2iUlwZZaFXPuwd
LL+xGJFLOIXhnB9P4Del563LHI+KzksSQ0nHTlnF/B1Nw9O8dwya2MLkMaxHAc5Z
PZQtHJai1Ombey+2U5aY3idCe0IHPgnSbyCtNGYmKNkutzrLlwCzAe4Ic4Dyxx49
KewlsaJxAgMBAAECggEADdYAbyDBZtcbjFLrKkdb66UHFoXP3FbG5PZ9CzpziKLd
pV4Zkknju73dAP4uH6Kl8UgsukgtcT9AISGEgiMce6V7TNOWbi9nd/lG6E9W4/MS
18pWYDME00UZUQnK3Ox/bstuLmTWiC+gHeYrJ94kKjXf/2N4huhv9ZFHsjKnPD/w
9pJiKvWyqOIO//SwsIqGBiuvIrxBxyUVEhfH6algIWIysafs6/ExYrHpLgGW4lcv
bGYzEY8r8SNLZc0v3zKlpa44bsV+foT0niHdX1UvFa9n7Q1y8zPHT5H9lcZFSVcS
k9H/FkoWqHWaF+6bzdOqAtCg/QxrdZvV9fhMEJ7zPQKBgQDMN2PCXUMFbOHzI/qk
7PWCKbA+kPFYmxkXnGRnKlG2rAq06HY8i0eVqUsIub5t6fZiP2UIEPGEWkQvwRZ4
GEZva/Ywbd/bjTZW3mvvq79aE5B2qOEW3rvJcC8Dn88mLK23028nowbUYAfvLVQ9
c5GDvOxKNLRChTe663Cq/CffzQKBgQDJv2t8OlZe6EutYAcWgXIhaCFhUQEF0q3h
K/5heuS3FCmqrU8pR6b8tKN3SHhGDHqjp4FC3t6fZ9KqZspt7GMxFiDTgTde4l8s
mLpspMeBMn9/+nq+7ZLkyAb42FPvzFNqo4tgOWPJ7l+XV/2ZVHTE7A84OcdUyAiE
qsGC0lKBNQKBgGXcRu0euZxOKBGv44g6DWdERf2fLFKm4ggt4MK4kBOOkrSTss4W
JrmWvK94fmyyo0t0FX/Fe8IpiBNNu1hhu1g+QIj9dQg80lrYDHx6bTKPyaH2MHfI
11/tjfW/04JWDLxBQRNDNNffonWBZaBVMcLFDBMjYLpBWn/oicUvivANAoGAVJjQ
4Hmx6AAuY5gFwNks23dHsAAAlsl+IhKJi6S1rVNmGWys6hlim0q/1O/thyoKbv95
Q2ojHeKyQsPxlGBwQ5AM2cOwTThNQm0UlyQNiE59ilOlDtSeKRL7YXOM1tvuCqRj
eEj4YB91tAewjpAMmtqFk0UfIZzzfXYAyPOapxUCgYEAyV5tRIBhURm+NzaNgNSV
EQilJI7j4c5CIkIOROZ/S7xd2doWIds8FkCJAWok8ecToR/YvtQNXP+JWFPo2Tmp
/wNVzWB/yKMyEJRWl863r71hVgAVn6efnNBEzd0aPfo271DDmAadvTB7f/i+//Ya
dY5xCW0OAqd6hk4FSSN83W4=
-----END PRIVATE KEY-----`;

/** Three 2-of-3 shares of the word "recovered". */
export const FIXTURE_SHARES = `01-67952a8573ead7dd10
02-589ef1a07c60230e8c
03-4d6eb84a79ef86b6f8`;
