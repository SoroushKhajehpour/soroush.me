import { TextFlippingBoard } from "@/components/ui/text-flipping-board";

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
      <TextFlippingBoard
        text="Soroush Khajehpour | 1B Computer Engineering @ The University of Waterloo"
        duration={0.9}
      />
    </div>
  );
}
