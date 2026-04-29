# 3D XR Studio

Web authoring tool for geo-referenced XR environments and guided tours.

## Purpose

Define real-world locations as 3D scenes, populate them with totems, points of interest and ordered tour stops, then publish for XR consumption.

## Core Features

* **Environments**: geo-referenced scenes managed on an interactive map (lat/lon + local Cartesian coordinates).
* **Totems**: anchored 3D objects placed within an environment, with custom transforms and media bindings.
* **POIs**: points of interest with descriptions, media attachments and relative 3D placement.
* **Tour routes**: ordered sequences of stops over an environment for guided navigation.
* **3D preview**: in-browser inspection of imported meshes and scene composition.
* **Localization**: it / en.

## Stack

* Frontend: React SPA, React Router, axios, Three.js for previews, Leaflet/map layer.
* Backend: Node.js / Express with SQL persistence.
* Authentication: JWT.

