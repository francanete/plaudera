import { NextResponse } from "next/server";
import { getPolarProducts } from "@/lib/pricing";
import { getCurrentSession } from "@/lib/dal";
import { polarClient } from "@/lib/polar-client";

export async function POST(request: Request) {
  try {
    const { slug } = await request.json();

    if (!slug) {
      return NextResponse.json(
        { error: "Product slug is required" },
        { status: 400 }
      );
    }

    const session = await getCurrentSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Find product
    const products = getPolarProducts();
    const product = products.find((p) => p.slug === slug);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const checkout = await polarClient.checkouts.create({
      products: [product.productId],
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
      customerEmail: session.user.email,
      externalCustomerId: session.user.id,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout" },
      { status: 500 }
    );
  }
}
