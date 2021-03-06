#  o p t S i e v e . p y
#
#  Chris Meyers. 10/26/2013
#
from htmlFrame import HtmlFrame
from matrix    import Matrix

htmlPage = HtmlFrame()
htmlPage.banner = "Animated Sieve of Erastosthenes"
BOLD   = "color:red;font-weight:bold;"

primes = Matrix(1,20)
primes.tableAttr = 'cellspacing="0" cellpadding="10"'
primes[0,0] = 2
nprimes = 1

for x in range(3,21) :
    primeSofar = True
    for px in range(nprimes) :
        primes.title = "Testing if %s is divisible by primes so far" % x
        primes.style[0,px] = BOLD
        htmlPage.item1 = primes.renderHtml(wrap=5)
        htmlPage.makeFrame()           #break
        primes.style[0,px] = ""
        div = primes[0,px]
        if x % div == 0 : primeSofar = False
        if not primeSofar : break

    if primeSofar :
        primes[0,nprimes] = x
        nprimes += 1
        primes.title = "Found a new prime %s" % x
    else :
        primes.title = "Not Prime: %s mod %s is zero" % (x,div)
    htmlPage.item1 = primes.renderHtml(wrap=5)
    htmlPage.makeFrame()

