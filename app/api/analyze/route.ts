import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { visionPrompt } from "@/lib/visionPrompt";
import { buildAnalysis } from "@/lib/structureEngine";
import { ChartState, TopDownFrame } from "@/lib/types";

export const runtime = "nodejs";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB

export async function POST(req: Request) {
  try {
    // Debug: log environment
    console.log("[ANALYZE] API Key present:", !!process.env.OPENAI_API_KEY);
    console.log("[ANALYZE] API Key length:", process.env.OPENAI_API_KEY?.length || 0);

    const contentType = req.headers.get("content-type") || "";

    // Handle direct chart state submission (from manual input)
    if (contentType.includes("application/json")) {
      const chartState = (await req.json()) as ChartState;
      const analysis = buildAnalysis(chartState);
      return NextResponse.json(analysis);
    }

    // Handle one or multiple image uploads (top-down)
    const form = await req.formData();
    const files = form.getAll("file").filter((f): f is File => f instanceof File);

    if (!files.length) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    for (const f of files) {
      if (!f.type.startsWith("image/")) {
        return NextResponse.json({ error: "Invalid file type. Please upload image files." }, { status: 400 });
      }
      const buf = await f.arrayBuffer();
      if (buf.byteLength > MAX_SIZE) {
        return NextResponse.json({ error: `Image ${f.name} is too large. Max 8MB.` }, { status: 400 });
      }
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured. Please use manual input or contact support." },
        { status: 500 }
      );
    }

    if (process.env.OPENAI_API_KEY.includes("your_openai_key_here") || process.env.OPENAI_API_KEY.length < 20) {
      return NextResponse.json(
        { error: "AI service configuration invalid. Please contact support." },
        { status: 500 }
      );
    }

    const chartStates: ChartState[] = [];
    const profileRaw = form.get("profile");
    const profile = typeof profileRaw === "string" ? (profileRaw.toUpperCase() as any) : undefined;

    for (const f of files) {
      try {
        const base64 = Buffer.from(await f.arrayBuffer()).toString("base64");
        const imageUrl = `data:${f.type};base64,${base64}`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: visionPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: "Extract chart_state from this TradingView screenshot. Return JSON only." },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 2000,
        });

        const text = response.choices[0]?.message?.content;
        if (!text) {
          throw new Error("Empty response from AI Vision service");
        }
        
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (parseErr) {
          console.error("JSON parse error:", text.substring(0, 200));
          throw new Error("Failed to parse AI response as JSON");
        }
        
        chartStates.push(parsed as ChartState);
      } catch (fileError: any) {
        console.error(`Error processing file ${f.name}:`, fileError?.message);
        throw fileError;
      }
    }

    // Compose top-down: last file treated as execution timeframe
    const primary = chartStates[chartStates.length - 1];
    const topDown: TopDownFrame[] = chartStates.map((cs, idx) => ({
      timeframe: cs.timeframe || `TF-${idx + 1}`,
      bias: cs.trend_hint,
      key_level: cs.price_region,
      narrative: cs.notes,
    }));

    const analysis = buildAnalysis({ ...primary, top_down: topDown });

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("/api/analyze error:", {
      message: error?.message,
      status: error?.status,
      type: error?.constructor?.name,
    });
    
    // Handle AI service errors
    if (error?.status === 401 || error?.message?.includes("401")) {
      return NextResponse.json(
        { error: "❌ AI service authentication failed. Please contact support for assistance." },
        { status: 500 }
      );
    }
    
    if (error?.status === 429 || error?.message?.includes("429")) {
      return NextResponse.json(
        { error: "⏳ Service temporarily busy. Please wait 60 seconds and try again." },
        { status: 500 }
      );
    }

    if (
      error?.code === "ECONNRESET" ||
      error?.code === "ENOTFOUND" ||
      error?.code === "ECONNREFUSED" ||
      error?.message?.toLowerCase().includes("fetch failed") ||
      error?.message?.toLowerCase().includes("connection")
    ) {
      return NextResponse.json(
        { error: "Connection error: AI service unreachable. Please retry in a minute." },
        { status: 500 }
      );
    }

    if (error?.message?.includes("Empty response")) {
      return NextResponse.json(
        { error: "🖼️ Chart image unclear. Please upload a clearer screenshot and try again." },
        { status: 500 }
      );
    }

    if (error?.message?.includes("JSON")) {
      return NextResponse.json(
        { error: "⚠️ Analysis failed. Please try uploading a different chart image." },
        { status: 500 }
      );
    }

    if (error?.message?.includes("Timeout") || error?.message?.includes("timeout")) {
      return NextResponse.json(
        { error: "⏱️ Request timed out. AI service is processing slowly. Please try again." },
        { status: 500 }
      );
    }
    
    const errorMessage = error?.message || "Analysis failed. Please check console for details.";
    return NextResponse.json({ error: `Error: ${errorMessage}` }, { status: 500 });
  }
}
