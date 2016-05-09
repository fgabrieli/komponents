app.komp.AddressBook = {
//    template : '<div>this is me</div>',
    
    templateUrl : 'komp-address-book.html',
    
    numbers : [2, 3, 4, 5, 6],
    
    show : true,

    isEven : function(n) {
        return n % 2 == 0;
    },
    
    init : function() {
        console.log('i was initialized');
    }
}