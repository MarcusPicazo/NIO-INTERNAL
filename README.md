# 🚀 Nimio Levels | Internal Management Platform / Plataforma de Gestión Interna

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=for-the-badge&logo=netlify)](https://nimio-levels.netlify.app/login)

(Spanish version below)

---

## 🇬🇧 English

A private, full-stack web application developed to manage team motivation, point tracking, level progression, custom avatars, and reward redemptions for the **NIMIO** team. 

Built with an emphasis on security and performance, the application ensures sensitive operations and approvals are handled securely server-side through signed HTTP-only cookies and robust database policies.

### 🔗 Live Link
Access the platform here: [https://nimio-levels.netlify.app/login](https://nimio-levels.netlify.app/login)

### Features
* **Role-Based Access Control:** Distinct workflows for Admins (email/password) and Members (hashed personal access codes).
* **Point & Reward Ecosystem:** Members can submit point requests with private evidence. Admins can approve, adjust, or reject requests, and manage reward redemptions.
* **Dynamic Progression:** Calculates member levels based on historical points, dynamically unlocking custom avatars or GIFs without losing progress when points are spent.
* **Admin Dashboard & Analytics:** Comprehensive management of users, reward catalogs, point ledgers, and CSV report exports.

### Technologies & Architecture
* **Frontend:** **Next.js** (App Router & Server Actions) and **TypeScript** for a scalable, type-safe architecture.
* **Styling:** **Tailwind CSS** delivering a premium, industrial, and responsive dark-mode UI.
* **Backend & Database:** **Supabase Postgres** for atomic functions, views, and RLS policies, coupled with `pgcrypto` for secure code hashing.
* **Cloud Storage:** **Supabase Storage** for handling avatars, GIFs, reward images, and private evidence.

### How to Run Locally
1. Clone the repository and install dependencies using `pnpm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase credentials and a generated `NIMIO_SESSION_SECRET`.
3. Run the initial schema migration and seed data in your Supabase SQL Editor.
4. Start the development server with `pnpm dev`.

---

## 🇪🇸 Español

Una aplicación web privada *full-stack* desarrollada para gestionar la motivación, el seguimiento de puntos, la progresión de niveles, avatares personalizados y el canje de recompensas para el equipo **NIMIO**.

Construida con un enfoque en la seguridad y el rendimiento, la aplicación asegura que las operaciones sensibles se manejen de forma segura del lado del servidor a través de cookies HTTP-only firmadas y políticas robustas de base de datos.

### 🔗 Enlace a la plataforma
Puedes acceder a la plataforma aquí: [https://nimio-levels.netlify.app/login](https://nimio-levels.netlify.app/login)

### Características Principales
* **Control de Acceso por Roles:** Flujos de trabajo separados para Administradores (correo/contraseña en `/admin/login`) y Miembros (códigos de acceso personales hasheados).
* **Ecosistema de Puntos y Recompensas:** Los miembros pueden solicitar puntos adjuntando evidencia privada. Los administradores pueden aprobar, ajustar o rechazar solicitudes y gestionar canjes.
* **Progresión Dinámica:** Calcula los niveles basándose en los puntos históricos, desbloqueando avatares o GIFs personalizados sin perder progreso al gastar puntos.
* **Panel de Administración y Analíticas:** Gestión completa de usuarios, catálogo de recompensas, auditoría de movimientos (*ledger*) y exportación de reportes en CSV.

### Tecnologías y Arquitectura
* **Frontend:** **Next.js** (App Router y Server Actions) y **TypeScript** para una arquitectura escalable y de tipado estricto.
* **Estilos:** **Tailwind CSS** para una interfaz oscura, industrial, premium y totalmente responsiva.
* **Backend y Base de Datos:** **Supabase Postgres** para funciones atómicas, vistas de saldos y políticas RLS, utilizando `pgcrypto` para el hash seguro de códigos.
* **Almacenamiento en la Nube:** **Supabase Storage** para avatares, imágenes de recompensas y evidencia privada.

### Instalación Local
1. Clona el repositorio e instala las dependencias usando `pnpm install`.
2. Copia `.env.example` a `.env.local` y configura tus variables de entorno de Supabase y tu `NIMIO_SESSION_SECRET`.
3. Ejecuta la migración del esquema inicial y los datos semilla (`seed.sql`) en el editor SQL de Supabase.
4. Inicia el servidor local con `pnpm dev`.

---
Developed by / Desarrollado por **Marco Antonio Escalona García** - Systems Engineer & AI Product Engineer
