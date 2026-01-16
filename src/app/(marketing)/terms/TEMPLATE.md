# Terms of Service Template

Generates minimal UK-compliant Terms of Service.

## Before Launching

Fill in `appConfig.legal` in `src/lib/config.ts`:

```typescript
legal: {
  company: {
    name: "Your Company Ltd",           // Required: Full legal name
    registrationNumber: "12345678",     // Required: Companies House number
    registeredAddress: "Your Address",  // Required: Can use virtual office
    contactEmail: "hello@example.com",  // Required: Contact email
  },
  terms: {
    minimumAge: 18,                     // Minimum age to use service
    jurisdiction: "England and Wales",  // Legal jurisdiction
  },
  lastUpdated: "January 2025",          // Update when you change terms
}
```

## What's Included (UK Compliant)

1. **Service Provider** - Company details (required by E-Commerce Regulations)
2. **Agreement** - Acceptance terms and age requirement
3. **The Service** - What you provide
4. **Your Account** - User responsibilities
5. **Payments** - Billing and cancellation
6. **Acceptable Use** - Prohibited activities
7. **Your Content** - User content ownership
8. **AI Features** - AI disclaimer
9. **Limitation of Liability** - Capped liability with required UK exceptions
10. **Termination** - How accounts can be closed
11. **Governing Law** - Jurisdiction
12. **Changes** - How terms can be updated
13. **Privacy** - Link to privacy policy
14. **Contact** - How to reach you

## Key UK Legal Requirements

The Limitation of Liability section includes:

- Cap at 12 months fees or £100
- Exclusion of indirect/consequential losses
- **Required exceptions**: death/injury from negligence, fraud, non-excludable liability

## To Customize Further

Ask Claude Code: "Update the terms page to add [specific section]"
