#  c f s m O p t . p y
#
#  Display for cfsm.py

import matrix, re
from   htmlFrame import HtmlFrame   # for standAlone
htmlFrame = HtmlFrame("cfsm")

template = """
   <html><body><h2>Item Sets </h2>
   %(mesg)s<br>
   <font face="Courier New">
   %(itemSetMatrix)s
   </html> """

outputOn = False

def initialize(grammar) :
    global outputOn
    outputOn = True
    gramStr = "<br/>\n".join(grammar)
    htmlFrame.gramStr = "Grammar<br/>\n" + gramStr

MATCOLS = 4
def makeIsPage(isNet,stateNum,message) :
    if not outputOn : return
    htmlFrame.mesg = "State %s: %s" % (stateNum,message)
    nrows = (len(isNet.itemSets)+(MATCOLS-1))/MATCOLS # ceiling
    mat = matrix.Matrix(nrows, MATCOLS)
    mat.tableAttr = 'border="1"'
    mat.dftFormat = "<pre>%s</pre>"
    mat.dftStyle  = "vertical-align:top"
    mat[0,0] = htmlFrame.gramStr
    for itemSet in isNet.itemSets :
        cellNum = itemSet.num+1
        row = cellNum / MATCOLS
        col = cellNum % MATCOLS
        mat[row,col] = itemSet
        if itemSet.status != "Complete" :
            mat.style[row,col]="background-color:lightgreen"
    htmlFrame.itemSetMatrix = mat.renderHtml()
    htmlFrame.makeFrame(template)

