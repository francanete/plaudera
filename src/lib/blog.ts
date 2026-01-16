import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import { appConfig } from "@/lib/config";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

export interface Author {
  name: string;
  avatar?: string;
  role?: string;
}

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: string;
  category?: string;
  image?: string;
  author?: Author;
  featured?: boolean;
  tags?: string[];
}

export interface Post extends PostMeta {
  content: string;
}

function ensureBlogDir() {
  if (!fs.existsSync(BLOG_DIR)) {
    fs.mkdirSync(BLOG_DIR, { recursive: true });
  }
}

/**
 * Validates that a slug contains only safe characters to prevent path traversal
 */
function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== "string") return false;
  // Allow only alphanumeric characters, hyphens, and underscores
  const slugRegex = /^[a-zA-Z0-9_-]+$/;
  return slugRegex.test(slug) && slug.length > 0 && slug.length <= 200;
}

export function getAllPosts(): PostMeta[] {
  try {
    ensureBlogDir();

    const files = fs
      .readdirSync(BLOG_DIR)
      .filter((file) => file.endsWith(".mdx"));

    const posts: PostMeta[] = [];

    for (const file of files) {
      try {
        const slug = file.replace(/\.mdx$/, "");
        const filePath = path.join(BLOG_DIR, file);
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const { data, content } = matter(fileContent);

        posts.push({
          slug,
          title: data.title || slug,
          description: data.description || "",
          date: data.date || new Date().toISOString(),
          readingTime: readingTime(content).text,
          category: data.category,
          image: data.image,
          author: data.author || { name: appConfig.team.name },
          featured: data.featured || false,
          tags: data.tags || [],
        });
      } catch (error) {
        console.error(`Error reading blog post ${file}:`, error);
      }
    }

    return posts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    console.error("Error reading blog directory:", error);
    return [];
  }
}

export function getPostBySlug(slug: string): Post | null {
  try {
    ensureBlogDir();

    // Validate slug to prevent path traversal attacks
    if (!isValidSlug(slug)) {
      console.warn(`Invalid slug attempted: ${slug}`);
      return null;
    }

    const filePath = path.join(BLOG_DIR, `${slug}.mdx`);

    // Additional safety check: ensure resolved path is within BLOG_DIR
    const resolvedPath = path.resolve(filePath);
    const resolvedBlogDir = path.resolve(BLOG_DIR);
    if (!resolvedPath.startsWith(resolvedBlogDir)) {
      console.warn(`Path traversal attempt detected: ${slug}`);
      return null;
    }

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    return {
      slug,
      title: data.title || slug,
      description: data.description || "",
      date: data.date || new Date().toISOString(),
      readingTime: readingTime(content).text,
      category: data.category || undefined,
      image: data.image || undefined,
      author: data.author || { name: appConfig.team.name },
      featured: data.featured || false,
      tags: data.tags || [],
      content,
    };
  } catch (error) {
    console.error(`Error reading blog post ${slug}:`, error);
    return null;
  }
}

export function getAllSlugs(): string[] {
  try {
    ensureBlogDir();

    return fs
      .readdirSync(BLOG_DIR)
      .filter((file) => file.endsWith(".mdx"))
      .map((file) => file.replace(/\.mdx$/, ""));
  } catch (error) {
    console.error("Error reading blog directory for slugs:", error);
    return [];
  }
}

export function getRelatedPosts(currentSlug: string, limit = 3): PostMeta[] {
  try {
    const allPosts = getAllPosts();
    const currentPost = allPosts.find((p) => p.slug === currentSlug);

    if (!currentPost) return [];

    return allPosts
      .filter((p) => p.slug !== currentSlug)
      .filter(
        (p) =>
          p.category === currentPost.category ||
          p.tags?.some((tag) => currentPost.tags?.includes(tag))
      )
      .slice(0, limit);
  } catch (error) {
    console.error(`Error getting related posts for ${currentSlug}:`, error);
    return [];
  }
}
