import $ from 'jquery'

function initMessages() {
  $('body').append(
    '<div id="vk_community_messages"></div>' +
      '<script type="text/javascript">' +
      'VK.Widgets.CommunityMessages("vk_community_messages", 169568508, {disableButtonTooltip: "1"});' +
      '</script>'
  )
}

export default initMessages
