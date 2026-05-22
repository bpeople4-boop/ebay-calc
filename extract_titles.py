from pathlib import Path
import csv


BASE_DIR = Path(__file__).resolve().parent
SOURCE = BASE_DIR / "eBay-OrdersReport-May-22-2026-15_34_44-0700-12320121246.csv"
DEST = BASE_DIR / "data" / "titles.csv"


def main() -> None:
    DEST.parent.mkdir(parents=True, exist_ok=True)

    with SOURCE.open("r", encoding="utf-8-sig", newline="") as src:
        raw_reader = csv.reader(src)
        next(raw_reader, None)
        header = next(raw_reader)
        reader = csv.DictReader(src, fieldnames=header, restval="")
        titles = []
        for row in reader:
            title = (row.get("商品のタイトル") or "").strip()
            if not title:
                continue
            if "Ship to JAPAN only" in title:
                continue
            titles.append(title)

    with DEST.open("w", encoding="utf-8", newline="") as dst:
        writer = csv.writer(dst)
        for title in titles:
            writer.writerow([title])

    print(f"Wrote {len(titles)} titles to {DEST}")


if __name__ == "__main__":
    main()
