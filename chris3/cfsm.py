#!/usr/local/bin/python
#
# c f s m . p y
#
# context free state machine
#
# Items are string (future tuple) rules with a dot supplied before
# the next token
# String rule "E=E+T" becomes item "E=.E+T" as start
# They are not built as objects being unmutable.
# A shifted item is always a new one.
#
import cfsmOpt
from   nf   import isNonTerm, allFirst, allNullable

def makeItem(rule) : 
    return rule[:2]+"."+rule[2:]

def mergeLahs(l1, l2) :
    return tuple(set(l1).union(set(l2)))
    
def shiftItem(item) :  
    over = nextToken(item)  # token to take
    assert over # Make sure there is a token to shift over
    p = item.find(".")
    return item[:p]+over+"."+item[p+2:]

def finalItem (item) :
    return item[-1:] == '.'

def nextToken(item) :
    if finalItem(item) : return None
    p = item.find(".")
    return item[p+1]

def remTokens(item) :
    # After the nextToken
    if finalItem(item) : return None
    p = item.find(".")
    return item[p+2:]

# The item-set network holds the grammar. It deduces the non-terminals
# from that, kicks off the recursive build of the itemr-sets, and
# from them computes the 2D shift/reduce table.

class ItemSetNet :
    dbg = False
    def __init__ (self, grammar) :
        from nf import calcNullable, calcFirstSets
        self.nullable = calcNullable(grammar)
        self.first    = calcFirstSets(grammar, self.nullable)
        dbg = self.dbg
        if dbg : print "Nullable=", self.nullable
        if dbg : print "FirstSet=", self.first
        self.itemSetLookup = {}        # lookup itemset by is kernal
        self.itemSets = []             # the itemsets by number
        self.grammar  = grammar
        ### Temp, just know that kernal has 2 items
        head0 = makeItem(grammar[0])
        head1 = makeItem(grammar[1])
        #assert head0[-1] == '$'   # make sure EOF marker there
        self.headItem = ItemSet( self, [head0,head1],[('$',),('$',)] )

#  Item-sets are objects with a kernal set of items plus
#  those expanded (recursively). As an item-set is built more
#  item-sets will be spun off with new kernals.
#  Item-sets are tracked by number and by the tuple of their
#  kernal items (itemSetLookup) to avoid building duplicate
#  item-sets.

class ItemSet :
    dbg = False

    def __init__(self, net, kernal=[], kernLahs=[]) :
        dbg = self.dbg # Allow flexibility for just this function
        self.num = len(net.itemSets)
        self.key = tuple(kernal)
        if dbg : print "\nNew ItemSet:"
        self.net   = net
        self.items = list(kernal)   # item to be built - mutatable
        self.lahs  = list(kernLahs) # valid lookaheads for nexttoken
        self.trans = {}             # maps next token to state to shift to
        self.final = False          # true if no outgoing paths
        self.already = net.itemSetLookup.get(self.key) # done already?
        net.itemSetLookup[self.key] = self.num
        net.itemSets.append(self)
        mesg = self.status = "Kernal set"
        if dbg : print "initial items/lahs", self.items, self.lahs
        #
        assert len(self.items) == len(self.lahs)
        # State Completion. mesg set for any change
        while mesg :
            if dbg : print "Top of loop:",mesg
            cfsmOpt.makeIsPage(net,self.num,mesg)
            self.status = "State completion"
            mesg = self.expandItems()
            if dbg : print "expandItems: ", mesg
        if self.already :
            prev = net.itemSets[self.already]
            for i in range(len(self.lahs)) :
                prev.lahs[i] = mergeLahs(prev.lahs[i],self.lahs[i])
            self.status = "Merged with State %s" % prev.num
            #self.items = self.lahs = []
        else :
            self.addTrans()
            self.status = "Complete"
        cfsmOpt.makeIsPage(net,self.num,"Item Set Done")

    def expandItems(self) :
        dbg = self.dbg
        mesg = done = ""
        net = self.net
        if dbg : print "========= Expand items Set=", self.num
        for ix in range(len(self.items)) :
            srcItem = self.items[ix]
            srcLahs = self.lahs[ix]
            tok = nextToken(srcItem)
            if not tok : continue
            if not isNonTerm(tok) : continue
            if dbg : print "Expand %s", srcItem, srcLahs, tok

            # Set up lookahead M for new items - Rule 4
            alpha = remTokens(srcItem) 
            if not alpha : newLahs = srcLahs
            else :
                newLahs = allFirst(alpha,net.first,net.nullable)
                if isNonTerm(alpha[0]) :
                    if allNullable(alpha,net.nullable) :
                        newLahs = mergeLahs(newLahs,srcLahs)

            for rule in net.grammar :
                if rule[0] == tok :
                    item = makeItem(rule)
                    if dbg:print "=== %s %s --> %s" % (srcItem,newLahs,item)
                    j = self.findItem(item)
                    if j >= 0 :
                        if dbg : print "Found",item,"at",j
                        # Item already in set. Merge lookaheads maybe
                        allLahs = mergeLahs(newLahs,self.lahs[j])
                        if allLahs != self.lahs[j] :
                            mesg = "Update lah to %s :" % self.items[j]
                            self.lahs[j] = allLahs
                            return mesg
                    else :
                        # New item in the set. Add it with Lah
                        self.items.append(item)
                        self.lahs.append(newLahs)
                        mesg = "Add item %s :" % item
                        return mesg
                else : pass
        return mesg

    def addTrans(self) :
        # Sets of items sharing a next token link to a new or
        # existing item-set with the set of items as the kernal.
        # our trans dict maps tok->itemSet
        dbg = self.dbg
        self.trans = {}
        items_lahs = zip(self.items,self.lahs)
        need = set([])
        for item in self.items :  # make set of next tokens
            nt = nextToken(item)
            if nt : need.add(nt)

        if dbg: print "Tokens needed", need
        for token in need :
            kernal=[]; lahs=[]
            for item,lah in items_lahs :
                if nextToken(item) == token :
                    kernal.append(shiftItem(item))
                    lahs.append(lah)
            kernal = tuple(kernal)
            if dbg :
                print "Tran via %s to" % token
                print "   kernal %s" % (kernal,)
                print "   lahs   %s" % (lahs,)

            self.status = "Token %s - spawn state" % token
            new = ItemSet(self.net,kernal,lahs)
            if new.already : t = new.already
            else           : t = new.num
            self.trans[token] = t

    def findItem(self, item) :
        for i in range(len(self.items)) :
            if self.items[i] == item : return i
        return -1

    def __str__ (self) :
        tag = "Item set %s" % (self.num)
        if self.trans :
            tag += "<br/>\n  Trans"
            trans = self.trans.keys(); trans.sort()
            for tran in trans : tag+= (' %s=S%s' % (tran,self.trans[tran]))
        tag += "<br/>\n  %s<br/>\n" % self.status
        lahs = self.lahs+[""]*len(self.items)
        for i in range(len(self.items)) :
            kflag = ("","*")[int(i < len(self.key))]
            lah = lahs[i]
            if lah : lah = '{'+"".join(lah)+'}'+kflag
            #tag += "  %-8s  %s\n"%(self.items[i],lah)
            tag += "  %-8s  %s<br/>\n"%(self.items[i],lah)
        return tag

def animate() :
    import sys,string
    import cfsmOpt
    grammar = open(sys.argv[1]).readlines()
    grammar = map(string.strip, grammar)
    cfsmOpt.initialize(grammar)
    isn = ItemSetNet(grammar)
    for i in range(len(isn.itemSets)) :
       iset = isn.itemSets[i]

