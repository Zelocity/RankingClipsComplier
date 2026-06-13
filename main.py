
from downloader import download_video
from cleanup import cleanup_project


def main():
    
    confirm = "y"
    while confirm == "y": 
        url = input("Paste video URL: ").strip()
        download_video(url)
        confirm = input("Upload another video?: ")
    
    userInput = input("Clean up project? (y): ")

    if userInput == "y":
        cleanup_project()
        print(f"Project is cleaned")
    else: 
        print(f"Project is not cleaned up")

if __name__ == "__main__":
    main()