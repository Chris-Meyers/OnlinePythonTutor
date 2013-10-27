#!/usr/bin/python
#
#   s t a n d A l o n e . p y
#
#   Overall coordinator for building a stand-alone animation
#
#   Do not use a link (symbolic or otherwise) to run this program
#   from another directory. You might want to do this to create 
#   the html in that directory. standAlone.py must run in its own
#   directory to access helper files like templates. You may create
#   a shell script like the following and put it in (say) /usr/local/bin
#
#   :
#   python path-to-standAlone/standAlone.py $*
#
#   The 1st argument is the animation code (knapsack.py). Any following
#   arguments become arguments to the animation code and in the
#   expected order.
#
import htmlFrame, os, re, sys

def main () :
    path    = os.path.abspath(__file__)
    exePath = os.path.dirname(path)

    animFile = sys.argv[1]
    animPath, animFilename = os.path.split(animFile)
    animSim = re.sub("\.py","",animFilename)

    htmlFrame.standAlone = True
    htmlFrame.simName = animSim

    sys.path = [animPath,exePath]+sys.path
    sys.argv = sys.argv[1:]   # align for the animation

    modl = __import__(animSim)
    try           : modl.animate()
    except        : pass        # probably animated on the import

    frames = htmlFrame.instance
    html = frames.embedFrames(exePath, 'dTemplate')
    open(animSim+".html","w").write(html)

if __name__ == "__main__" : main()

