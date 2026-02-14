"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "what-is-reelzero",
    question: "What is ReelZero?",
    answer:
      "ReelZero is an AI-powered platform that generates professional 60-second vertical videos from a text prompt. It automatically writes the script, generates the visuals, and records a voiceover — producing a ready-to-post MP4 for Reels, Shorts, and TikTok in under 90 seconds.",
  },
  {
    id: "how-credits-work",
    question: "How do credits work?",
    answer:
      "1 credit = 1 video generation (up to 60 seconds). Credits are included in your monthly plan and reset on your billing date each month. Unused credits do not roll over. Free tier includes 3 credits/month at no cost.",
  },
  {
    id: "video-format",
    question: "What format are the videos?",
    answer:
      "All videos are MP4 (H.264), 1080×1920 pixels (full HD vertical), at 30fps, approximately 60 seconds in length. Free tier videos are 720p and include a small watermark.",
  },
  {
    id: "credits-exhausted",
    question: "What happens when my free credits run out?",
    answer:
      "Video generation is paused until your credits reset at the start of your next billing cycle. You can upgrade to a paid plan at any time to get more credits immediately — no automatic charges are made.",
  },
  {
    id: "own-images",
    question: "Can I use my own images instead of AI-generated ones?",
    answer:
      "Yes. For any scene in your video, you can upload your own image (PNG, JPG, or WEBP, up to 5MB). ReelZero will automatically resize it to the correct 1080×1920 format. You can mix AI-generated and uploaded images in the same video.",
  },
  {
    id: "generation-time",
    question: "How long does video generation take?",
    answer:
      "Most videos are ready in under 90 seconds. The process includes audio generation (~15s), timing synchronization (~5s), rendering (~40s), and finalizing (~10s). You stay on the page while it processes.",
  },
];

export function LandingFaq() {
  return (
    <section id="faq" className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Everything you need to know before getting started.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="rounded-xl border border-border/50 bg-card/50 px-4 backdrop-blur-sm"
            >
              <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
