import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AvatarPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Avatar</h1>
      <p className="text-sm text-text-secondary mb-8">
        Radix-powered avatar. Falls back to initials when image is unavailable.
      </p>

      <ComponentPreview label="Examples">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="User" />
          <AvatarFallback>PP</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>PP</AvatarFallback>
        </Avatar>
        <Avatar className="h-10 w-10">
          <AvatarFallback>TC</AvatarFallback>
        </Avatar>
      </ComponentPreview>
    </div>
  );
}
