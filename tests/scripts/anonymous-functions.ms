Foo function(), "test"
  return 1
end function

Foo "test", function()
  return 1
end function

Foo = {"test": function()}
	return 1
end function

Foo = [function()]
	return 1
end function

foo = function()
    return function()
        return "faa"
    end function
end function

print foo()()