valueOfIdentifier = "foo"

myObject = {
	"test": {
		"another": "123",
	},
	"value": "123",
	"idtf": valueOfIdentifier,
}

print([myObject.test.another, myObject.value, myObject.idtf])

myList = [
	{
		"another": "123",
	},
	"123",
	valueOfIdentifier,
]

print(myList)