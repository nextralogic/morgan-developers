import { Facebook, MessageCircle, Send, Share2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareButtonsProps {
  title: string;
  url?: string;
}

const ShareButtons = ({ title, url }: ShareButtonsProps) => {
  const shareUrl = url || window.location.href;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "hover:bg-[#1877F2]/10 hover:text-[#1877F2]",
    },
    {
      label: "Messenger",
      icon: MessageCircle,
      href: `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=&redirect_uri=${encodedUrl}`,
      color: "hover:bg-[#0099FF]/10 hover:text-[#0099FF]",
    },
    {
      label: "WhatsApp",
      icon: () => (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
      color: "hover:bg-[#25D366]/10 hover:text-[#25D366]",
    },
    {
      label: "Viber",
      icon: () => (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
          <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.294 4.177.518 6.77.399 9.932c-.12 3.163-.27 9.09 5.566 10.726l.007.003v2.452s-.038.99.614 1.193c.79.245 1.254-.508 2.01-1.327.414-.449.986-1.108 1.418-1.613 3.9.33 6.895-.42 7.237-.534.79-.263 5.263-.83 5.988-6.774.748-6.126-.354-9.997-2.32-11.737 0 0-1.997-1.86-6.09-2.212-.59-.05-1.134-.082-1.635-.09h-.004zM11.5 1.604c.428.006.9.034 1.422.078 3.496.303 5.175 1.803 5.175 1.803 1.689 1.494 2.607 4.942 1.95 10.31-.613 5.006-4.359 5.39-5.024 5.612-.287.096-2.882.738-6.153.53 0 0-2.437 2.94-3.198 3.705-.119.12-.257.166-.35.144-.131-.032-.167-.19-.165-.418l.026-4.026c-4.934-1.393-4.645-6.413-4.545-9.13.1-2.716.752-4.937 2.207-6.381C4.948 1.852 8.727 1.564 11.5 1.604zm.283 3.044c-.197 0-.197.306 0 .31 1.348.019 2.477.5 3.377 1.36.9.86 1.395 2.044 1.442 3.377.005.2.31.193.306-.005-.052-1.434-.59-2.715-1.563-3.648-.973-.933-2.178-1.46-3.556-1.493l-.006-.001zm-2.003.76c-.237-.012-.478.075-.613.3l-.707 1.105c-.249.39-.174.87.098 1.19.385.467.87.863 1.022 1.005l.02.018c.41.374 1.082.93 1.513 1.218.337.224.822.163 1.078-.127l.678-.77c.262-.297.683-.337.997-.123.577.395 1.27.897 1.82 1.386.32.285.35.76.082 1.086l-.656.797c-.252.306-.648.436-1.024.326-1.326-.388-2.858-1.49-3.897-2.54-.9-.912-1.81-2.329-2.303-3.545-.143-.354-.008-.743.318-1.013l.843-.691c.132-.108.338-.276.44-.393.15-.17.216-.384.19-.6a.555.555 0 00-.152-.345c-.07-.072-.33-.367-.637-.725a.738.738 0 00-.43-.268.812.812 0 00-.203-.014h-.009l-.001-.001zm2.424 1.09c-.2-.014-.22.293-.02.312 1.012.096 1.868.527 2.504 1.18.637.652 1.007 1.508 1.05 2.504.006.2.31.19.305-.01-.047-1.093-.456-2.04-1.15-2.75-.696-.71-1.616-1.165-2.683-1.234l-.006-.001zm.094 1.72c-.199-.02-.236.28-.039.31.682.103 1.204.636 1.289 1.312.023.197.33.176.307-.024-.103-.826-.732-1.477-1.549-1.596l-.008-.001z" />
        </svg>
      ),
      href: `viber://forward?text=${encodedTitle}%20${encodedUrl}`,
      color: "hover:bg-[#7360F2]/10 hover:text-[#7360F2]",
    },
  ];

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Share2 className="h-4 w-4" /> Share:
      </span>
      {links.map((link) => (
        <Button
          key={link.label}
          variant="ghost"
          size="icon"
          className={`h-9 w-9 rounded-full ${link.color}`}
          title={`Share on ${link.label}`}
          onClick={() => {
            const w = window.open(link.href, "shareWindow", "width=600,height=500,noopener,noreferrer");
            if (!w) toast.error("Please allow popups to share.");
          }}
        >
          <link.icon />
        </Button>
      ))}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full hover:bg-accent"
        onClick={copyLink}
        title="Copy link"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ShareButtons;
