import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Undo,
  Redo,
  Variable,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EmailRichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const VARIABLES: { token: string; label: string; description: string }[] = [
  {
    token: "{{name}}",
    label: "受信者の名前",
    description: "プロフィールの表示名 (未設定なら空文字)",
  },
  {
    token: "{{email}}",
    label: "受信者のメールアドレス",
    description: "送信先メアド",
  },
];

const EmailRichTextEditor = ({ content, onChange }: EmailRichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Outlook 互換性のため不要な装飾を排除
        heading: { levels: [2, 3] },
        blockquote: false,
        codeBlock: false,
        code: false,
        strike: false,
      }),
      Image,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener" } }),
      Placeholder.configure({ placeholder: "メール本文を入力..." }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const addImage = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ALLOWED_IMAGE_TYPES.join(",");
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast({
          title: "対応していない形式です",
          description: "JPEG / PNG / GIF / WebP のみアップロード可能",
          variant: "destructive",
        });
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast({
          title: "ファイルサイズが大きすぎます",
          description: "5MB 以下の画像を選んでください",
          variant: "destructive",
        });
        return;
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("email-campaign-images")
        .upload(path, file, { contentType: file.type });
      if (error) {
        toast({
          title: "画像アップロードに失敗しました",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("email-campaign-images").getPublicUrl(path);
      editor.chain().focus().setImage({ src: publicUrl }).run();
    };
    input.click();
  };

  const addLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("リンク URL を入力 (空欄で解除)", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertVariable = (token: string) => {
    editor.chain().focus().insertContent(token).run();
  };

  const ToolBtn = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={title}
      className={cn("h-8 w-8", active && "bg-accent")}
      onClick={onClick}
    >
      {children}
    </Button>
  );

  return (
    <div className="border border-input rounded-lg overflow-hidden bg-background">
      <div className="flex flex-wrap gap-0.5 p-1.5 border-b border-border bg-muted/30">
        <ToolBtn
          title="太字"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          title="斜体"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px bg-border mx-1" />
        <ToolBtn
          title="見出し2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          title="見出し3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
        >
          <Heading3 className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px bg-border mx-1" />
        <ToolBtn
          title="箇条書き"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          title="番号付きリスト"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          title="区切り線"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px bg-border mx-1" />
        <ToolBtn title="リンク" onClick={addLink} active={editor.isActive("link")}>
          <LinkIcon className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn title="画像 (5MB以下)" onClick={addImage}>
          <ImageIcon className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px bg-border mx-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              title="変数を挿入"
            >
              <Variable className="h-4 w-4" />
              変数
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {VARIABLES.map((v) => (
              <DropdownMenuItem
                key={v.token}
                className="flex flex-col items-start gap-0.5 py-2"
                onClick={() => insertVariable(v.token)}
              >
                <code className="text-xs font-mono text-primary">{v.token}</code>
                <span className="text-xs text-foreground/80">{v.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {v.description}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="w-px bg-border mx-1" />
        <ToolBtn
          title="元に戻す"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          title="やり直す"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo className="h-4 w-4" />
        </ToolBtn>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[320px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-md [&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_hr]:my-4 [&_.ProseMirror_hr]:border-border"
      />
    </div>
  );
};

export default EmailRichTextEditor;
