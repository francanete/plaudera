# Privacy Policy Template

Generates a minimal UK GDPR-compliant Privacy Policy.

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
  dataHandling: {
    subProcessors: [                    // List your actual providers
      "Neon - Database (US)",
      "Polar - Payments (EU)",
      // Add/remove as needed
    ],
  },
  terms: {
    minimumAge: 18,
    jurisdiction: "England and Wales",
  },
  lastUpdated: "January 2025",          // Update when you change the policy
}
```

## What's Included (UK GDPR Compliant)

1. **Data Controller** - Company name, number, address, email (required by Article 13)
2. **Information We Collect** - Account, payment, usage, technical data
3. **How We Use Your Data** - Purposes of processing
4. **Legal Basis** - Contract, legitimate interest, legal obligation
5. **Third-Party Services** - Sub-processors list
6. **International Transfers** - Safeguards for non-UK data
7. **Data Retention** - How long we keep data
8. **Your Rights** - All GDPR rights
9. **Cookies** - Essential cookies only
10. **Complaints** - ICO information
11. **Contact** - How to reach you

## To Customize Further

Ask Claude Code: "Update the privacy page to add [specific section]"
