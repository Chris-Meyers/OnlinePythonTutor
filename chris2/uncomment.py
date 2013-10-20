#
#   u n c o m m e n t . p y
#
#   javascript comments, both /* ... */ and // to eol
#

import sys, re

prog = list(sys.stdin.read()) + [None,None,None]
x = 0
while prog[x] != None :
    #print "top of loop:", x, prog[x]
    if prog[x]=='/' and prog[x+1]=='/' :
        while prog[x] != '\n' :
            if prog[x] == None : break
            prog[x] = None
            x += 1
    elif prog[x]=='/' and prog[x+1]=='*' :
        while prog[x] != None :
            if prog[x] == '*' and prog[x+1] == '/' :
                prog[x] = prog[x+1] = None
                x += 2
                break
            else :
                # inside old style comment
                prog[x] = None
                x += 1
    else : x += 1           # Actually in code

prog = filter(lambda x: x != None, prog)
prog = "".join(prog)
prog = re.sub(" *\n","\n",prog)  # clip trailing spaces
prog = re.sub("\n\n*","\n",prog) # multi empty lines to single
print prog
