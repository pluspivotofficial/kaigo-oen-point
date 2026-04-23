const AppFooter = () => {
  return (
    <footer className="mt-8 pt-6 pb-4 border-t border-border text-center space-y-1">
      <p className="text-[11px] text-muted-foreground">
        運営：
        <a
          href="https://www.pluspivot.co.jp/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline ml-1 font-medium"
        >
          株式会社プラス・ピボット
        </a>
      </p>
      <p className="text-[10px] text-muted-foreground">
        お問い合わせ：
        <a
          href="https://www.pluspivot.co.jp/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline ml-1"
        >
          公式サイトより
        </a>
      </p>
      <p className="text-[10px] text-muted-foreground/70">
        © {new Date().getFullYear()} Plus Pivot Co., Ltd.
      </p>
    </footer>
  );
};

export default AppFooter;
