import { NextResponse } from "next/server";
import { getPolarProducts } from "@/lib/pricing";
import { getCurrentSession } from "@/lib/dal";
import { polarClient } from "@/lib/polar-client";

export async function POST(request: Request) {
  try {
    const { slug, email } = await request.json();

    if (!slug) {
      return NextResponse.json(
        { error: "Product slug is required" },
        { status: 400 }
      );
    }

    // Try to get existing session (optional for guest checkout)
    const session = await getCurrentSession();

    // Find product
    const products = getPolarProducts();
    const product = products.find((p) => p.slug === slug);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Build checkout params
    const checkoutParams: {
      products: string[];
      successUrl: string;
      customerEmail?: string;
      externalCustomerId?: string;
    } = {
      products: [product.productId],
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
    };

    if (session?.user) {
      // Logged-in user - only trust session data, not request body
      checkoutParams.customerEmail = session.user.email;
      checkoutParams.externalCustomerId = session.user.id;
    } else if (email) {
      // Guest checkout with email provided
      // Note: userId from request body is intentionally ignored for security
      // The webhook will create/link the user based on email
      checkoutParams.customerEmail = email;
    }
    // else: Let Polar collect email during checkout (full guest mode)

    const checkout = await polarClient.checkouts.create(checkoutParams);

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout" },
      { status: 500 }
    );
  }
}
