# YeeStone Trail

A browser-based Oregon Trail-style game themed on an annual ski trip with the
guys. Pick a profession, book your flight and rental, then make it through
the flying, driving, and skiing mini-games while managing your money, hunger,
and how injured you get along the way. Built with React, TypeScript, Vite,
and TailwindCSS.

## Development

```bash
npm install
npm run dev      # start local dev server with hot reload
npm run build    # type-check and build to dist/
npm run preview  # preview the production build locally
npm run lint      # run oxlint
```

## Deployment

Pushes to `main` build the site and deploy it to S3 (behind CloudFront) via
GitHub Actions — see `.github/workflows/deploy-website.yml`. It authenticates
to AWS via OIDC (no long-lived keys), so it needs an `AWS` environment
configured in the repo's Settings → Environments with these variables:

- `AWS_ROLE_ARN` — IAM role ARN to assume, trusted for GitHub's OIDC provider
- `AWS_REGION`
- `S3_BUCKET_NAME`
- `CLOUDFRONT_DISTRIBUTION_ID`
