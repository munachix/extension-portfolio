# GoldenMap: Golden Hour & Sun Planner for Google Maps

## Store listing
- **Name:** GoldenMap: Golden Hour & Sun Planner for Google Maps
- **Summary:** Golden hour, blue hour & sun direction for any spot on Google Maps. Plan photo shoots on desktop. Sunrise, sunset & moon.
- **Category:** Photos
- **SEO keywords:** golden hour calculator, golden hour map, sun position map, sunrise sunset photography, blue hour, photo shoot planner, sun direction

## Problem
Photographers scout locations on Google Maps on their laptop, then switch to a phone app (PhotoPills, Sun Surveyor) or the SunCalc website to see the light. Nothing shows the light directly on Google Maps.

## Competition
- **Phone apps:** PhotoPills, Sun Surveyor, Golden Hour One, LightTrac.
- **Website:** SunCalc.org.
- **Chrome extensions:** only generic sunrise/sunset tools, none working inside Google Maps.

**Our edge:** works where they already scout, needs zero setup, one-time price.

## MVP features (free)
- Floating panel on google.com/maps showing, for the map center:
  - Sunrise, sunset, golden hour (morning and evening), blue hour.
  - A compass arrow showing the sun's direction at sunrise and sunset.
- Today only.

## Pro ($12 one-time)
- **Date and time slider:** pick any date, see the sun angle and shadow direction update.
- Sun path arc drawn over the map (canvas overlay).
- Moonrise, moonset and moon phase. Milky Way core visibility window.
- **Cloud cover forecast** for golden hour (Open-Meteo, free and no key needed).
- Saved locations + "Add shoot to calendar" (.ics download).

## Tech
- Read coordinates from the URL (`/@lat,lng,zoom`) and watch for URL changes.
- Sun and moon math with **SunCalc.js** (BSD-2 license, include its license notice). All on-device.
- Overlay: an absolutely positioned panel + canvas centered on the map. The sun arc is drawn from the map center using the azimuth (the sun's compass direction). It doesn't need to match the map's projection exactly at the zoom levels used for scouting.
- **Permissions:** `storage`, host `https://www.google.com/maps/*`, `https://api.open-meteo.com/*` (Pro).

## Acceptance tests
- [ ] Panning the map updates the times within 300ms.
- [ ] Times match SunCalc.org within 1 minute for 3 test cities.
- [ ] Panel can be collapsed and remembers its position.

## Risks
- Google Maps page changes: we only rely on the URL plus our own overlay, so there's little that can break.
- Not affiliated with Google. Say so in the listing.
