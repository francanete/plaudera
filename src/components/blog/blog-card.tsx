import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import type { PostMeta } from "@/lib/blog";
import { cn } from "@/lib/utils";
import { appConfig } from "@/lib/config";

interface BlogCardProps {
  post: PostMeta;
  featured?: boolean;
}

export function BlogCard({ post, featured = false }: BlogCardProps) {
  const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const authorInitials =
    post.author?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "ST";

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn("group block h-full", featured && "md:col-span-2")}
    >
      <Card
        className={cn(
          "flex h-full flex-col gap-0 overflow-hidden border-slate-200 bg-white py-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
          featured && "md:grid md:grid-cols-2"
        )}
      >
        {/* Image Area */}
        {post.image && (
          <div
            className={cn(
              "w-full overflow-hidden bg-slate-100",
              featured
                ? "aspect-video md:aspect-auto md:h-full"
                : "aspect-video"
            )}
          >
            <Image
              src={post.image}
              alt={post.title}
              width={800}
              height={450}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        )}

        <CardContent className="flex flex-1 flex-col p-6">
          {/* Category & Date & Reading Time */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            {post.category && (
              <Badge
                variant="secondary"
                className="bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                {post.category}
              </Badge>
            )}
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formattedDate}
              </span>
              {post.readingTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {post.readingTime}
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <h3
            className={cn(
              "mb-2 leading-tight font-bold text-slate-900",
              featured ? "line-clamp-2 text-2xl" : "line-clamp-2 text-xl"
            )}
          >
            {post.title}
          </h3>

          {/* Description */}
          <p className="line-clamp-3 text-sm text-slate-600">
            {post.description}
          </p>
        </CardContent>

        <CardFooter className="border-t border-slate-100 p-6">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="ring-background h-8 w-8 ring-2">
                {post.author?.avatar && (
                  <AvatarImage
                    src={post.author.avatar}
                    alt={post.author.name}
                  />
                )}
                <AvatarFallback className="bg-slate-100 text-xs text-slate-500">
                  {authorInitials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-slate-900">
                {post.author?.name || appConfig.team.name}
              </span>
            </div>

            <div className="text-primary flex items-center text-sm font-medium opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
              Read more <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
