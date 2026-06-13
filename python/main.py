from RankingVideo.downloader import download_video
from RankingVideo.remover import remove_project
from RankingVideo.videocomplier import compile_videos
from RankingVideo.job import createJob, removeJob

def main():
    
    createJob("123")

    createJob("345")
    createJob("567")

    input("continue")

    removeJob("123")
    removeJob("345")
    removeJob("567")

    # confirm = "y"
    # # while confirm == "y": 
    #     url = input("Paste video URL: ").strip()
    #    # download_video(url, "../storage/input")
    #     confirm = input("Upload another video?: ")
    

    #compile_videos("../storage/input", "../storage/output")

    #remove_project()


if __name__ == "__main__":
    main()