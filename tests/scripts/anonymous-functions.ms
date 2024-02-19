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