// This file has intentional lint errors for testing pre-commit hooks
const unused_variable = "test"  // No semicolon, unused variable
var badVarDeclaration = 'should use const/let'

function  badSpacing( ){
    console.log('multiple  spaces')
}
