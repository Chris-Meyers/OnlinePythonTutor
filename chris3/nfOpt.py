#  n f O p t . p y
#

import matrix, string
from   htmlFrame import HtmlFrame    # for standAlone
htmlFrame = HtmlFrame("nf")
outputOn = False

template = """
  <html><body><h2>Nullable and First Sets</h2>
  <p>%(mesg)s</p>
  <table border="1"  cellspacing="5"><tr>
  <td style="vertical-align:top">Grammar<p>
  %(grammarMatrix)s</td>
  <td style="vertical-align:top">Nullable terms<p>
  %(nullableMatrix)s</td>
  <td style="vertical-align:top">First Sets<p>
  <font face="Courier New">
  %(firstMatrix)s</td>
  </tr></table>
  </html> """

def initialize(grammar) :
    if not outputOn : return
    grammarMatrix(grammar)
    htmlFrame.nullableMatrix = ""
    htmlFrame.firstMatrix    = ""

def grammarMatrix(grammar) :
    if not outputOn : return
    lists = []
    for rule in grammar :
        nt,rest = rule.split('=')
        lists.append([nt]+list(rest))
    m = matrix.Matrix(data=lists)
    m.dftFormat = "<pre>%s</pre>"
    htmlFrame.grammarMatrix = m.renderHtml()

def makeNullablePage(nullable, mesg) :
    if not outputOn : return
    if nullable :
        mat = matrix.Matrix(data=nullable)
        mat.dftFormat = "<pre>%s</pre>"
        htmlFrame.nullableMatrix = mat.renderHtml()
        htmlFrame.mesg = mesg
    else : htmlFrame.mesg = "No Nonterminals are Nullable"
    htmlFrame.makeFrame(template)

def makeFirstPage(first, mesg) :
    if not outputOn : return
    htmlFrame.mesg = mesg           # Display before change
    htmlFrame.makeFrame(template)
    mat = matrix.Matrix(data=first)
    mat.dftFormat = "<pre>%s</pre>"
    htmlFrame.firstMatrix = mat.renderHtml()
    htmlFrame.makeFrame(template)

