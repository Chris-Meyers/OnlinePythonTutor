# o p t F i b . p y
#
#  Chris Meyers. 09/25/2013
#

htmlPage = HtmlFrame()
htmlPage.banner = "Animated Fibonacci Sequence"
BOLD   = "color:red;font-weight:bold;"

fibs = Matrix(1,20)
fibs.tableAttr = 'cellspacing="0" cellpadding="10"'
fibs[0,0] = 1
fibs[0,1] = 1

for i in range(2,100) :
    fibs.style[0,i-1] = BOLD
    fibs.style[0,i-2] = BOLD
    fibs[0,i] = fibs[0,i-1]+fibs[0,i-2]
    fibs.title = "Last 2 elements add for new one"
    htmlPage.item1 = fibs.renderHtml(wrap=10)
    htmlPage.makeFrame()    #break
    fibs.style[0,i-2] = ""  # uncolor behind

