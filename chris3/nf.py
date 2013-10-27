#!/usr/local/bin/python
#
#   n f . p y
#
#   Nullable and First Sets
#
import string, sys
import nfOpt

def isNonTerm(t) : return t in string.uppercase

def findNonTerm(eset) :
    for token in eset :
        if isNonTerm(token) : return token
    return None

def calcNullable(grammar) :
    nullable = {}
    # Initial set with a null production
    for rule in grammar :
        nonterm,rest = rule.split("=")
        if not rest :
            #nullable[nonterm] = ['Nullable']
            nullable[nonterm] = True
    # Also any other nonterm containing only nullable
    changed = True
    cause = "Initial nullable set"
    while changed :
        nfOpt.makeNullablePage(nullable, cause)
        changed = False
        cause = "-- "
        for rule in grammar :
            nonterm,rest = rule.split("=")
            if not nullable.get(nonterm) :
                isNull = True
                for t in rest :
                    if not nullable.get(t) : isNull = False
                if isNull :
                    nullable[nonterm] = True
                    cause += "Rule '%s' makes %s nullable -- " % (rule,nonterm)
                    changed = True
    return nullable

def calcFirstSets (grammar, nullable) :
    dbg = False
    rhs = {}
    for s in grammar :
        nonterm,rest = s.split("=")
        if rest :
            sofar = rhs.get(nonterm,[])
            sofar.append(rest)
            rhs[nonterm] = sofar
    mesg = "Initial Productions"
    if dbg: print mesg
    if dbg: print rhs
    while mesg :
        nfOpt.makeFirstPage(rhs, mesg)
        if dbg: print "Message: %s" % mesg
        mesg = ""
        keys = rhs.keys(); keys.sort()
        for key in keys :
            seqs = rhs[key]
            if dbg: print "=== Top", key,seqs
            for i in range(len(seqs)) :
                alfa = seqs[i]
                x = alfa[0:1]; beta=alfa[1:]
                if dbg: print "=== key alfa beta", (key,alfa,beta)
                # if alfa is empty, then First(alfa) is empty set
                if not alfa : pass
                elif alfa == key :
                    mesg = "%s: discard self reference" % key
                    seqs[i] = beta
                    if dbg: print "  ===", mesg
                # If alfa is xBeta and x is terminal, then First(alfa) is {x}
                elif beta and not isNonTerm(x) : 
                    mesg = "%s: replace %s by %s" % (
                            key,        alfa , x)
                    seqs[i] = x
                    if dbg: print "  ===", mesg
                # If alfa single non-term X, First(X) union of first sets
                #    of productions. Use only if fully expanded
                elif isNonTerm(x) and not beta :
                    # alfa is single and if expanded replace
                    xDone = (findNonTerm("".join(rhs[x])) == None)
                    if xDone :
                        mesg = "%s replace %s with %s" % (
                                key,        alfa, x)
                        seqs[i:i+1] = rhs[x]
                        if dbg: print "  ==i=", mesg
                elif isNonTerm(x) and beta :
                    if nullable.get(x) :
                    # set first(alfa) to first(alfa)+first(beta)
                        mesg = "%s nullable: split %s to %s and %s" %(
                                key,             x,x,beta)
                        seqs[i:i+1] = [x,beta]
                        if dbg: print "  ===", mesg
                    else :
                        # set First(alfa) to First(X)
                        mesg = "%s not nullable: take %s of %s" % (
                                key,                  x,    alfa)
                        seqs[i:i+1] = [x]
                if mesg :
                    if dbg: print "  ===", mesg
                    break
            if mesg : break
    nts = rhs.keys()
    for nt in nts : rhs[nt] = tuple(set(rhs[nt]))
    nfOpt.makeFirstPage(rhs, "Complete first sets")
    return rhs

mtTuple = tuple([])

def allFirst(seq, firstSet, nullable, sofar=()) :
    # Return tuple of all possible first terminals for a seq
    if not seq : return sofar
    tok = seq[0]
    sofar = set(sofar)
    if isNonTerm(tok) :
        sofar = sofar.union(set(firstSet.get(tok,[])))
        if nullable.get(tok) :
            rest = allFirst(seq[1:],firstSet,nullable,tuple(sofar))
            return tuple(sofar.union(rest))
        else :
            return tuple(sofar)
    else :
        return (tok,)

def allNullable(seq, nullable) :
    # return true iff all tokens in seq are nullable
    for c in seq :
        if not nullable.get(c) : return False
    return True

def animate () :
    nfOpt.outputOn = True
    grammar = open(sys.argv[1]).readlines()
    grammar = map(string.strip, grammar)

    nfOpt.initialize(grammar)
    nullable = calcNullable(grammar)
    first    = calcFirstSets(grammar, nullable)
    return
