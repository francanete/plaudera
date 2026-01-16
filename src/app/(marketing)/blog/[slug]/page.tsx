import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, Clock, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { getAllSlugs, getPostBySlug, getRelatedPosts } from "@/lib/blog";
import { appConfig } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BlogCard } from "@/components/blog/blog-card";
import { ShareButtons } from "@/components/blog/share-buttons";
import { getBaseUrl, getCanonicalUrl } from "@/lib/seo";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: `Post Not Found | ${appConfig.name}`,
    };
  }

  const baseUrl = getBaseUrl();
  const postUrl = `${baseUrl}/blog/${slug}`;

  return {
    title: `${post.title} | ${appConfig.name}`,
    description: post.description,
    alternates: {
      canonical: postUrl,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: postUrl,
      siteName: appConfig.name,
      type: "article",
      publishedTime: post.date,
      authors: post.author?.name ? [post.author.name] : undefined,
      ...(post.image && {
        images: [
          {
            url: post.image.startsWith("http")
              ? post.image
              : `${baseUrl}${post.image}`,
            width: 1200,
            height: 630,
            alt: post.title,
          },
        ],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      ...(post.image && {
        images: [
          post.image.startsWith("http")
            ? post.image
            : `${baseUrl}${post.image}`,
        ],
      }),
    },
  };
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-slate prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mb-6 prose-h2:mt-12 prose-h2:text-2xl prose-h3:text-xl prose-p:mb-6 prose-p:leading-8 prose-p:text-slate-600 prose-blockquote:border-l-4 prose-blockquote:border-slate-200 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-600 max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h2: ({ children }) => (
            <h2 className="mt-12 mb-6 text-2xl font-bold text-slate-900">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 mb-4 text-xl font-bold text-slate-900">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-6 text-lg leading-8 text-slate-600">{children}</p>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-8 rounded-r-lg border-l-4 border-indigo-500 bg-slate-50 py-2 pl-6 text-xl text-slate-700 italic">
              {children}
            </blockquote>
          ),
          li: ({ children }) => (
            <li className="mb-2 ml-6 list-disc text-slate-600">{children}</li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-indigo-600 underline hover:text-indigo-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const authorInitials =
    post.author?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "ST";

  const relatedPosts = getRelatedPosts(slug, 3);
  const postUrl = getCanonicalUrl(`/blog/${slug}`);

  return (
    <>
      <ArticleJsonLd
        title={post.title}
        description={post.description}
        url={postUrl}
        image={post.image}
        datePublished={post.date}
        author={{ name: post.author?.name || appConfig.team.name }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: getCanonicalUrl("/") },
          { name: "Blog", url: getCanonicalUrl("/blog") },
          { name: post.title, url: postUrl },
        ]}
      />
      <div className="min-h-screen bg-white font-sans text-slate-900">
        {/* Article Header */}
        <header className="pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="container mx-auto max-w-3xl px-4">
            {/* Back Link */}
            <Link
              href="/blog"
              className="group mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Blog
            </Link>

            {/* Category & Date */}
            <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
              {post.category && (
                <Badge
                  variant="secondary"
                  className="border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                >
                  {post.category}
                </Badge>
              )}
              <span className="text-slate-400">&bull;</span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="h-4 w-4" />
                {formattedDate}
              </span>
              <span className="text-slate-400">&bull;</span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <Clock className="h-4 w-4" />
                {post.readingTime}
              </span>
            </div>

            {/* Title */}
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl lg:text-6xl lg:leading-[1.1]">
              {post.title}
            </h1>

            {/* Description */}
            <p className="mb-8 text-xl leading-relaxed text-slate-500 md:text-2xl">
              {post.description}
            </p>

            {/* Author */}
            <div className="flex items-center justify-between border-t border-b border-slate-100 py-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border border-slate-100">
                  {post.author?.avatar && (
                    <AvatarImage
                      src={post.author.avatar}
                      alt={post.author?.name}
                    />
                  )}
                  <AvatarFallback className="bg-slate-100 font-medium text-slate-500">
                    {authorInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-slate-900">
                    {post.author?.name || appConfig.team.name}
                  </div>
                  {post.author?.role && (
                    <div className="text-sm text-slate-500">
                      {post.author.role}
                    </div>
                  )}
                </div>
              </div>
              <ShareButtons title={post.title} slug={slug} />
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {post.image && (
          <div className="container mx-auto mb-16 max-w-5xl px-4 md:mb-24">
            <div className="relative aspect-2/1 w-full overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        )}

        {/* Article Content */}
        <article className="container mx-auto mb-24 max-w-3xl px-4">
          <MarkdownContent content={post.content} />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-16 border-t border-slate-100 pt-8">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-slate-200 px-3 py-1 text-slate-600 hover:border-slate-300"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Author Bio Section */}
        <section className="border-y border-slate-100 bg-slate-50 py-16">
          <div className="container mx-auto max-w-3xl px-4">
            <div className="flex flex-col items-start gap-8 md:flex-row">
              <Avatar className="h-24 w-24 border-2 border-white shadow-sm">
                {post.author?.avatar && (
                  <AvatarImage
                    src={post.author.avatar}
                    alt={post.author?.name}
                  />
                )}
                <AvatarFallback className="bg-slate-100 text-xl font-medium text-slate-500">
                  {authorInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  About the Author
                </h3>
                <p className="mb-4 leading-relaxed text-slate-600">
                  {post.author?.name || appConfig.team.name} is part of the{" "}
                  {appConfig.name} team, sharing insights and updates about our
                  platform.
                </p>
                <Button
                  variant="link"
                  className="h-auto p-0 font-semibold text-indigo-600"
                  asChild
                >
                  <Link href="/blog">
                    View all posts by{" "}
                    {post.author?.name?.split(" ")[0] || "the team"}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="bg-white py-24">
            <div className="container mx-auto max-w-6xl px-4">
              <div className="mb-12 flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Related Articles
                </h2>
                <Button variant="outline" className="hidden md:flex" asChild>
                  <Link href="/blog">View all articles</Link>
                </Button>
              </div>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {relatedPosts.map((relatedPost) => (
                  <BlogCard key={relatedPost.slug} post={relatedPost} />
                ))}
              </div>
              <div className="mt-12 text-center md:hidden">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/blog">View all articles</Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="bg-slate-900 py-24 text-white">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <h2 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">
              Ready to transform your workflow?
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-300 md:text-xl">
              Join thousands of teams who use {appConfig.name} to build better
              products faster. Start your 14-day free trial today.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="h-12 w-full bg-white px-8 font-semibold text-slate-900 hover:bg-slate-100 sm:w-auto"
                asChild
              >
                <Link href="/pricing">Get Started for Free</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full border-slate-700 bg-transparent px-8 text-white hover:bg-slate-800 hover:text-white sm:w-auto"
                asChild
              >
                <Link href="/pricing">Contact Sales</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
