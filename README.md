# RPB Web

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/docs/app/api-reference/cli/create-next-app).

## Formula Reference

### Available Variables

| Variable | Description |
|----------|-------------|
| `length` | Panjang (mm) |
| `width` | Lebar (mm) |
| `height` | Tinggi (mm) |
| `panel_thickness` / `p` / `t` | Tebal panel (30 atau 45) |

Also available: results from previously calculated items (referenced by their `code`).

### Available Functions

| Function | Description | Example |
|----------|-------------|---------|
| `ROUND(value, digits)` | Round to decimal places | `ROUND(3.14159, 2)` = 3.14 |
| `CEIL(value)` | Round up | `CEIL(3.2)` = 4 |
| `FLOOR(value)` | Round down | `FLOOR(3.8)` = 3 |
| `ABS(value)` | Absolute value | `ABS(-5)` = 5 |
| `MAX(...values)` | Maximum value | `MAX(1, 5, 3)` = 5 |
| `MIN(...values)` | Minimum value | `MIN(1, 5, 3)` = 1 |
| `PCT(base, pct)` | Percentage of value | `PCT(100, 10)` = 10 |
| `PERSEN(base, pct)` | Alias for PCT (Indonesian) | `PERSEN(200, 15)` = 30 |

### IF Function

```
IF(condition, valueIfTrue, valueIfFalse)
```

**Comparison operators:** `>`, `<`, `>=`, `<=`, `==`, `!=`
**Logical operators:** `&&`, `||`, `!`

**Examples:**

| Formula | Result |
|---------|--------|
| `IF(panel_thickness > 30, 10, 5)` | 10 if thickness is 45, 5 if 30 |
| `IF(p == 45, 1, 0)` | 1 if thickness is 45 |
| `IF(length > 3000, 10, 5)` | 10 if length > 3000 |
| `IF(width >= 1000 && height >= 800, 2, 1)` | 2 if both conditions true |
| `IF(p == 30, omega_profil * 6, 0)` | Conditional based on thickness |

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font) font family.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-template&utm_campaign=create-next-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/building-your-application/deploying) for more details.
