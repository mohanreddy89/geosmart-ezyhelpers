# 📍 Bangalore Locality & Transit Finder

An interactive web application built with **Next.js**, **Tailwind CSS**, and **Supabase** that maps Bangalore's residential localities, apartments, and public transit network in real-time.

---

## 🚀 Key Features

* **Interactive Map Visualization:** Client-side dynamic map rendering for Bangalore's key localities, residential apartments, and transit hubs.
* **Proximity Calculation:** Real-time distance and adjacent locality calculation within a 3.5 km radius using the Haversine formula.
* **Live Transit POI Layers:** Real-time fetching of nearby Namma Metro stations, BMTC bus stops, Indian Railways stations, and auto stands powered by OpenStreetMap's Overpass API.
* **Fault-Tolerant Mirroring & Fallbacks:** Multi-endpoint failover system with strict content-type validation to bypass API rate limits, timeouts, and XML error responses gracefully.
* **Smart Supabase Caching:** Checks local database cache for transit points before reaching out to third-party APIs to minimize network requests.
* **State & URL Synchronization:** Preserves search context and deep-links directly to localities or specific apartments via Next.js URL query parameters (`?locality=...&apartment=...`).
* **Instant Apartment Search:** Real-time autocomplete filter for searching apartments across Bangalore.

---

## 🛠️ Tech Stack

* **Framework:** [Next.js](https://nextjs.org/) (App Router, React 19)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Database & BaaS:** [Supabase](https://supabase.com/)
* **Mapping Library:** Client-side dynamic Leaflet / OpenStreetMap integration
* **External Services:** Overpass API (OpenStreetMap data)

---

## ⚙️ Getting Started

### 1. Prerequisites

Make sure you have **Node.js 18+** and a package manager (**npm**, **yarn**, **pnpm**, or **bun**) installed.

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone [https://github.com/mohanreddy89/geosmart-ezyhelpers.git]
cd geosmart-ezyhelpers
npm install
