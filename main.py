
from downloader import download_video
from remover import remove_project
from videocomplier import compile_videos

def main():
    
    confirm = "y"
    while confirm == "y": 
        url = input("Paste video URL: ").strip()
        download_video(url)
        confirm = input("Upload another video?: ")
    

    compile_videos()

    remove_project()


if __name__ == "__main__":
    main()