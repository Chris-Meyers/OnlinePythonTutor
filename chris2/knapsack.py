#  k n a p s a c k . p y
#
#  Chris Meyers. 10/17/2013
#

from htmlFrame2 import HtmlFrame
from matrix     import Matrix

maxwgt = 10
vals = [0,10,40,30,50]
wgts = [0, 5, 4, 6, 3]

htmlPage = HtmlFrame()
htmlPage.banner = "Knapsack Problem"
headers=['wt'+str(i) for i in range(maxwgt+1)]

inp = Matrix(len(vals),3)
inp.title = "Sack holds weight %s" % maxwgt
inp.dftFormat = "<pre>%03s</pre>"
inp.tableAttr = 'border="1" cellspacing="0" cellpadding="4"',
inp.tableHeaders=['Item #','Weight','Value']             
for i in range(len(vals)) :
  inp.setrowVals(i, [i, wgts[i], vals[i]])

frame = Matrix(1,2)
frame[0,0] = inp.renderHtml()
nItems = len(vals)
best = Matrix(nItems,maxwgt+1)
best.dftFormat = "<pre>%03s</pre>"

for i in range(1,nItems) :
  best.setrowVal(i,0)
for i in range(1,nItems) :
  for w in range(0,maxwgt+1) :
    remBest = best[i-1,w-wgts[i]]
    if remBest == None : remBest = 0
    newSolution = vals[i]+remBest
    if ((wgts[i] <= w and newSolution > best[i-1,w])) :
      best[i,w] = newSolution
      best.style[i,w] = "background-color:pink"
      best.title = "Optimal solution for weight %s includes item %s" % (w,i)
      best.tableAttr='border="1" cellspacing="0" cellpadding="4"'
      best.tableHeaders=headers
      frame[0,1] = best.renderHtml()
      htmlPage.item1 = frame.renderHtml()
      htmlPage.makeFrame()  #break
    else :
      best[i,w] = best[i-1,w]

print htmlPage.embedFrames('dTemplate')

