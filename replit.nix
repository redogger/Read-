{ pkgs }: {
  deps = [
    pkgs.python310
    pkgs.playwright-driver.browsers
    pkgs.libgbm
    pkgs.nss
    pkgs.libxkbcommon
    pkgs.atk
    pkgs.at-spi2-atk
    pkgs.cups
    pkgs.dbus
    pkgs.pango
    pkgs.gtk3
  ];
}
