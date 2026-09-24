# Signal Atlas

An interactive visual atlas and documentation platform for understanding AI-assisted programming signals, context boundaries, and agent workflows.

![Architecture Diagram](https://via.placeholder.com/1200x600.png?text=Signal+Atlas+Architecture)

## Overview
Signal Atlas is a fullstack React application designed to visually map complex agentic programming workflows. It provides real-time visualization of LLM context windows, system prompts, and tool execution graphs.

## Tech Stack
- **Frontend**: React, Vite, Framer Motion for graph animations, Tailwind CSS, Lucide Icons.
- **Backend**: Express.js REST API.
- **Database**: PostgreSQL with Drizzle ORM.
- **State Management**: Wouter (routing), React Query.

## Architecture
The platform is built on a client-server model. The Vite frontend heavily uses Framer Motion for dynamic layout transitions of the Atlas nodes. The Express backend serves as a headless API, managing persistent state via Drizzle ORM and providing a WebSocket integration layer for live agent telemetry.

## Local Setup
1. Clone the repository.
2. Run `npm install` in the root directory.
3. Configure `.env` with your `DATABASE_URL`.
4. Run `npm run db:push` to apply the Drizzle schema.
5. Run `npm run dev` to start both the client and server concurrently.
