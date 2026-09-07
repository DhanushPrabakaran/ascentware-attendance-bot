# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, Vite, Tailwind CSS (Frontend) and NestJS (Backend).

## Users

System Administrators and Managers who oversee the workforce.

## Product Purpose

An administrative command center and dashboard for the Ascentware Attendance Bot. It allows admins to manage employees, view real-time attendance, track breaks, and approve or reject leave requests.

## Positioning

A real-time, authoritative pulse of the workforce that transforms raw bot interaction logs into actionable management insights.

## Operating Context

Used by admins on desktop browsers during their workday to verify who is online, handle pending leave requests, and configure company-wide attendance settings.

## Capabilities and Constraints

- Capabilities: Real-time dashboard, Employee Directory, Individual Profile metrics, Leave Management (Approve/Reject), Shift definitions.
- Constraints: Must integrate with the existing backend APIs (`/api/v1/admin/*`).

## Brand Commitments

The user explicitly rejected the previous "muddy blue-green" and "dark slate" themes. A completely new, fresh, and highly usable visual identity is required.

## Evidence on Hand

- Live APIs returning realistic employee, attendance, and leave data.
- Known data structures (Attendance status: ACTIVE, ON_BREAK, LATE, etc.).

## Product Principles

1. Immediate Visibility: Anomalies (like absences or pending leaves) must be instantly recognizable without hunting.
2. Authoritative Control: The application must feel like a reliable management tool, not a raw database viewer.
3. Fluid Operations: Common actions (approving leaves, checking an employee's status) should require minimal clicks.
