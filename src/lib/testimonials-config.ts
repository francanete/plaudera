/**
 * Individual testimonial definition
 */
export interface TestimonialDefinition {
  id: string;
  author: string;
  role: string;
  company: string;
  quote: string;
  initials: string;
  featured?: boolean;
  stats?: string;
}

/**
 * Section header configuration
 */
export interface TestimonialsSectionHeader {
  badge: string;
  title: string;
  description: string;
}

/**
 * Testimonials section configuration
 */
export interface TestimonialsSectionConfig {
  id: string;
  header: TestimonialsSectionHeader;
  testimonials: TestimonialDefinition[];
}

/**
 * Homepage testimonials configuration
 */
export const testimonialsConfig: TestimonialsSectionConfig = {
  id: "testimonials",
  header: {
    badge: "Trusted by Industry Leaders",
    title: "Loved by innovative teams worldwide",
    description:
      "Join thousands of developers and businesses who rely on our platform to power their most critical workflows.",
  },
  testimonials: [
    {
      id: "sarah-chen",
      author: "Sarah Chen",
      role: "VP of Engineering",
      company: "TechFlow",
      quote:
        "The reliability and uptime have been outstanding. We migrated our entire infrastructure in less than a week and haven't looked back since. It's rare to find a tool that balances power with simplicity so effectively.",
      initials: "SC",
      featured: true,
      stats: "99.99% Uptime",
    },
    {
      id: "marcus-rodriguez",
      author: "Marcus Rodriguez",
      role: "Product Lead",
      company: "SaaSify",
      quote:
        "This platform has completely transformed how we handle our payments. The API documentation is world-class.",
      initials: "MR",
      stats: "2x Dev Speed",
    },
    {
      id: "emily-watson",
      author: "Emily Watson",
      role: "CTO",
      company: "DataSphere",
      quote:
        "Security was our top priority. The compliance features gave us the confidence to scale globally.",
      initials: "EW",
    },
    {
      id: "david-park",
      author: "David Park",
      role: "Founder",
      company: "Lumina",
      quote:
        "The flexible pricing and scalable architecture meant we never had to worry about outgrowing the platform.",
      initials: "DP",
    },
    {
      id: "jessica-foster",
      author: "Jessica Foster",
      role: "Head of Operations",
      company: "GlobalReach",
      quote:
        "The analytics dashboard provides insights we didn't even know we needed. Optimized conversion by 15%.",
      initials: "JF",
      stats: "+15% Conversion",
    },
  ],
};
