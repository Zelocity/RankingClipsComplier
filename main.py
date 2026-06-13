
from downloader import download_video


def main():
    url = input("Paste video URL: ").strip()
    download_video(url)


if __name__ == "__main__":
    main()