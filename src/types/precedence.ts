export enum Precedence {
  None = 0,
  Or = 10,
  And = 20,
  Not = 30,
  Isa = 40,
  Comparisons = 50,
  AddSub = 60,
  MultDiv = 70,
  UnaryMinus = 80,
  New = 90,
  AddressOf = 100,
  Power = 110,
  Call = 120
}
